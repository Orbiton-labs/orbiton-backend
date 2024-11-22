import PoolRepository from "../../apis/repositories/pool.repository";
import PositionRepository from "src/apis/repositories/position.repository";
import { PoolWrapper } from "orbiton-contracts";
import { Address } from "@ton/core";
import {
  Blockchain,
  RemoteBlockchainStorage,
  SandboxContract,
  wrapTonClient4ForRemote,
} from "@ton/sandbox";
import { TonClient4 } from "@ton/ton";
import { getHttpV4Endpoint } from "@orbs-network/ton-access";
import { IPosition } from "../../@types";

export const syncPools = async () => {
  let blockchain = await Blockchain.create({
    storage: new RemoteBlockchainStorage(
      wrapTonClient4ForRemote(
        new TonClient4({
          endpoint: await getHttpV4Endpoint({
            network: "mainnet",
          }),
        })
      )
    ),
  });
  blockchain.verbosity = {
    ...blockchain.verbosity,
  };
  const pools = await PoolRepository.getAll();
  for (const pool of pools) {
    const poolContract = blockchain.openContract(
      new PoolWrapper.PoolTest(Address.parse(pool.poolAddress))
    );
    const positions = await PositionRepository.getAll({
      poolId: pool._id.toString(),
    });
    await Promise.all(
      positions.map((position) =>
        syncPosition(
          {
            ...position,
            poolId: position.poolId.toString(),
          },
          poolContract
        )
      )
    );
  }
};

const syncPosition = async (
  position: IPosition,
  poolContract: SandboxContract<PoolWrapper.PoolTest>
) => {};
