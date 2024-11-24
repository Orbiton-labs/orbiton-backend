import PoolRepository from "../../apis/repositories/pool.repository";
import PositionRepository from "../../apis/repositories/position.repository";
import {
  PoolWrapper,
  BatchTickWrapper,
  Q128,
  JettonWalletWrapper,
} from "orbiton-contracts";
import { loadInfo, Info as TickInfo } from "orbiton-contracts/build/tlb/tick";
import { Address, OpenedContract } from "@ton/core";
import {
  Blockchain,
  RemoteBlockchainStorage,
  SandboxContract,
  wrapTonClient4ForRemote,
} from "@ton/sandbox";
import { TonClient, TonClient4 } from "@ton/ton";
import { getHttpV4Endpoint } from "@orbs-network/ton-access";
import { IPool, IPosition } from "../../@types";
import env from "../../configs/env";
import { setTimeout } from "timers/promises";
import { FeeGrowthMath } from "../../utils/math/feegrowth.util";
import { SqrtPriceMath } from "../../utils/math/sqrtpricemath.util";
import { TickMath } from "../../utils/math/tickmath.util";
import { getTokenInfoByTokenMaster } from "../pricing";
import { createTonWallet } from "../../utils";

export const syncPools = async () => {
  console.log("Syncing pools started...!");
  let { client } = await createTonWallet();
  while (true) {
    try {
      const pools = await PoolRepository.getAll({});
      for (const pool of pools) {
        const poolContract = client.open(
          new PoolWrapper.PoolTest(Address.parse(pool.poolAddress))
        );
        const [jetton0Address, jetton1Address] =
          await poolContract.getJettonsWallet();
        const poolInfo = await poolContract.getPoolInfo();
        const positions = await PositionRepository.getAll({
          poolId: pool._id.toString(),
        });
        if (positions && positions.length > 0) {
          const [feeAmount0, feeAmount1] = await calculateFeeAmountsInPool(
            positions.map((item) => {
              return {
                ...item.toJSON(),
                poolId: item.poolId.toString(),
              };
            }),
            poolContract,
            client
          );
          const [tokenAmount0, tokenAmount1] =
            await calculateTokenAmountsInPool(
              positions.map((item) => {
                return {
                  ...item.toJSON(),
                  poolId: item.poolId.toString(),
                };
              }),
              poolInfo.tick
            );
          const poolData = await PoolRepository.getByPoolAddress(
            pool.poolAddress
          );
          const { tvl, totalVolume, totalFee } = await getAnalystData(
            tokenAmount0,
            tokenAmount1,
            feeAmount0,
            feeAmount1,
            poolData.toJSON(),
            jetton0Address,
            jetton1Address,
            client
          );
          await PoolRepository.update(poolData.poolAddress, {
            ...poolData.toJSON(),
            liquidity: tvl,
            totalVolume,
            totalFee,
          });
        }
      }
    } catch (err) {}
    await setTimeout(3000);
  }
};

const getAnalystData = async (
  token0Amount: bigint,
  token1Amount: bigint,
  feeAmount0: bigint,
  feeAmount1: bigint,
  pool: IPool,
  jetton0Address: Address,
  jetton1Address: Address,
  client: TonClient
) => {
  const jetton0Contract = client.open(
    new JettonWalletWrapper.JettonWallet(jetton0Address)
  );
  const jetton1Contract = client.open(
    new JettonWalletWrapper.JettonWallet(jetton1Address)
  );
  const [jetton0Data, jetton1Data] = await Promise.all([
    jetton0Contract.getWalletData(),
    jetton1Contract.getWalletData(),
  ]);
  const [jetton0Master, jetton1Master] = [
    jetton0Data.jettonMasterAddress,
    jetton1Data.jettonMasterAddress,
  ];
  const [jetton0Info, jetton1Info] = [
    getTokenInfoByTokenMaster(jetton0Master.toString()),
    getTokenInfoByTokenMaster(jetton1Master.toString()),
  ];
  const totalFee =
    Number(feeAmount0 / BigInt(10 ** jetton0Info.decimals)) *
      Number(jetton0Info.price) +
    Number(feeAmount1 / BigInt(10 ** jetton1Info.decimals)) *
      Number(jetton1Info.price);
  const tvl =
    Number(token0Amount / BigInt(10 ** jetton0Info.decimals)) *
      Number(jetton0Info.price) +
    Number(token1Amount / BigInt(10 ** jetton1Info.decimals)) *
      Number(jetton1Info.price);
  const totalVolume = (BigInt(totalFee) / BigInt(pool.fee)) * BigInt(1000000);
  return {
    tvl: tvl.toString(),
    totalVolume: totalVolume.toString(),
    totalFee: totalFee.toString(),
  };
};

const calculateFeeAmountsInPool = async (
  positions: IPosition[],
  poolContract: OpenedContract<PoolWrapper.PoolTest>,
  blockchain: TonClient
) => {
  const feesTokenOnPositions = await Promise.all(
    positions.map((position) => {
      return syncFeeAmountPositions(position, poolContract, blockchain);
    })
  );
  const totalToken0FeeAmount = feesTokenOnPositions.reduce(
    (acc, val) => acc + val[0],
    0n
  );
  const totalToken1FeeAmount = feesTokenOnPositions.reduce(
    (acc, val) => acc + val[1],
    0n
  );

  return [totalToken0FeeAmount, totalToken1FeeAmount];
};

const calculateTokenAmountsInPool = async (
  positions: IPosition[],
  tickCurrent: bigint
) => {
  const tokenAmountsOnPositions = await Promise.all(
    positions.map((position) => {
      return syncTokenAmountPositions(position, tickCurrent);
    })
  );
  const totalToken0Amount = tokenAmountsOnPositions.reduce(
    (acc, val) => acc + val[0],
    0n
  );
  const totalToken1Amount = tokenAmountsOnPositions.reduce(
    (acc, val) => acc + val[1],
    0n
  );

  return [totalToken0Amount, totalToken1Amount];
};

const syncFeeAmountPositions = async (
  position: IPosition,
  poolContract: OpenedContract<PoolWrapper.PoolTest>,
  blockchain: TonClient
) => {
  const [feeGrowthGlobal0X128, feeGrowthGlobal1X128] =
    await poolContract.getFeesGrowthGlobal();
  const poolInfo = await poolContract.getPoolInfo();
  const currentTick = poolInfo.tick;
  const positionTickLower = position.tickLower;
  const positionTickUpper = position.tickUpper;
  const [batchTickLower, batchTickUpper] = await Promise.all([
    poolContract.getBatchTickIndex(BigInt(positionTickLower)),
    poolContract.getBatchTickIndex(BigInt(positionTickUpper)),
  ]);
  const [batchTickLowerAddress, batchTickUpperAddress] = await Promise.all([
    poolContract.getBatchTickAddress(batchTickLower),
    poolContract.getBatchTickAddress(batchTickUpper),
  ]);
  const [batchTickLowerContract, batchTickUpperContract] = await Promise.all([
    blockchain.open(new BatchTickWrapper.BatchTickTest(batchTickLowerAddress)),
    blockchain.open(new BatchTickWrapper.BatchTickTest(batchTickUpperAddress)),
  ]);
  const [tickDataLower, tickDataUpper] = await Promise.all([
    batchTickLowerContract.getTick(BigInt(positionTickLower)),
    batchTickUpperContract.getTick(BigInt(positionTickUpper)),
  ]);
  const [tickInfoLower, tickInfoUpper] = [
    loadInfo(tickDataLower.beginParse()),
    loadInfo(tickDataUpper.beginParse()),
  ];
  const [poolFeeGrowthInside0LastX128, poolFeeGrowthInside1LastX128] =
    FeeGrowthMath.getFeeGrowthInside(
      tickInfoLower,
      tickInfoUpper,
      BigInt(positionTickLower),
      BigInt(positionTickUpper),
      currentTick,
      feeGrowthGlobal0X128,
      feeGrowthGlobal1X128
    );
  const amount0 =
    ((poolFeeGrowthInside0LastX128 -
      BigInt(position.feeGrowthInside0LastX128)) *
      BigInt(position.liquidity)) /
      Q128 +
    BigInt(position.tokenOwed0);
  const amount1 =
    ((poolFeeGrowthInside1LastX128 -
      BigInt(position.feeGrowthInside1LastX128)) *
      BigInt(position.liquidity)) /
      Q128 +
    BigInt(position.tokenOwed1);
  return [amount0, amount1];
};

const syncTokenAmountPositions = async (
  position: IPosition,
  tickCurrent: bigint
) => {
  let sqrtRatioAX96 = SqrtPriceMath.getSqrtRatioAtTick(position.tickLower);
  let sqrtRatioBX96 = SqrtPriceMath.getSqrtRatioAtTick(position.tickUpper);
  let sqrtRatioX96 = SqrtPriceMath.getSqrtRatioAtTick(Number(tickCurrent));

  if (tickCurrent < position.tickLower) {
    return [
      SqrtPriceMath.getAmount0Delta(
        TickMath.getSqrtRatioAtTick(position.tickLower),
        TickMath.getSqrtRatioAtTick(position.tickUpper),
        BigInt(position.liquidity),
        true
      ),
      0n,
    ];
  } else if (tickCurrent < position.tickUpper) {
    return [
      SqrtPriceMath.getAmount0Delta(
        sqrtRatioX96,
        sqrtRatioBX96,
        BigInt(position.liquidity),
        true
      ),
      SqrtPriceMath.getAmount1Delta(
        sqrtRatioAX96,
        sqrtRatioX96,
        BigInt(position.liquidity),
        true
      ),
    ];
  } else {
    return [
      0n,
      SqrtPriceMath.getAmount0Delta(
        TickMath.getSqrtRatioAtTick(position.tickLower),
        TickMath.getSqrtRatioAtTick(position.tickUpper),
        BigInt(position.liquidity),
        true
      ),
    ];
  }
};
