import { catchAsync } from "../../utils";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import PoolRepository from "../repositories/pool.repository";
import {
  Blockchain,
  printTransactionFees,
  RemoteBlockchainStorage,
  SandboxContract,
  wrapTonClient4ForRemote,
} from "@ton/sandbox";
import {
  Address,
  beginCell,
  Dictionary,
  Sender,
  toNano,
  TonClient4,
} from "@ton/ton";
import { getHttpV4Endpoint } from "@orbs-network/ton-access";
import env from "../../configs/env";
import {
  JettonMinterWrapper,
  JettonWalletWrapper,
  MIN_SQRT_RATIO,
  PoolWrapper,
} from "orbiton-contracts";

async function getJettonWalletClient(
  sender: Sender,
  jettonMasterAddress: string,
  blockchain: Blockchain
): Promise<SandboxContract<JettonWalletWrapper.JettonWallet>> {
  const jettonMasterInContract = blockchain.openContract(
    JettonMinterWrapper.JettonMinter.createFromAddress(
      Address.parse(jettonMasterAddress as string)
    )
  );
  const jettonWalletInAddress = await jettonMasterInContract.getWalletAddress(
    sender.address
  );
  const jettonWalletInContract = blockchain.openContract(
    JettonWalletWrapper.JettonWallet.createFromAddress(jettonWalletInAddress)
  );
  return jettonWalletInContract;
}

namespace PoolController {
  export const getAll = catchAsync(async (req: Request, res: Response) => {
    const data = await PoolRepository.getAll({});
    res.status(StatusCodes.OK).json({
      message: "Get pool successfully",
      data,
    });
  });

  export const simulateSwap = catchAsync(
    async (req: Request, res: Response) => {
      const {
        jettonInAddress,
        jettonInAmount,
        jettonOutAddress,
        senderAddress,
      } = req.query;
      let blockchain = await Blockchain.create({
        storage: new RemoteBlockchainStorage(
          wrapTonClient4ForRemote(
            new TonClient4({
              endpoint: "https://mainnet-v4.tonhubapi.com",
            })
          )
        ),
      });
      let sender = blockchain.sender(Address.parse(senderAddress as string));
      const [
        allPoolsOne,
        allPoolsTwo,
        jettonWalletInContract,
        jettonWalletOutContract,
      ] = await Promise.all([
        PoolRepository.getAll({
          jetton0MasterAddress: jettonInAddress as string,
          jetton1MasterAddress: jettonOutAddress as string,
        }),
        PoolRepository.getAll({
          jetton0MasterAddress: jettonOutAddress as string,
          jetton1MasterAddress: jettonInAddress as string,
        }),
        getJettonWalletClient(sender, jettonInAddress as string, blockchain),
        getJettonWalletClient(sender, jettonOutAddress as string, blockchain),
      ]);
      const allPools = [...allPoolsOne, ...allPoolsTwo];

      if (allPools.length === 0) {
        throw new Error("No pool found for swapping!");
      }

      // find best returned simulate
      let returnedAmount = 0n;
      let data: any = null;
      for (const pool of allPools) {
        const zeroForOne =
          jettonInAddress === pool.jetton0MasterAddress ? -1 : 0;

        const [beforeSenderExecute, beforeJettonReceived] = await Promise.all([
          (async () => {
            return (
              await blockchain.getContract(
                Address.parse(senderAddress as string)
              )
            ).balance;
          })(),
          (async () => {
            return (await jettonWalletOutContract!.getBalance()).amount;
          })(),
        ]);

        console.log({
          kind: "OpJettonTransferSwap",
          query_id: 0,
          jetton_amount: BigInt(jettonInAmount as string),
          to_address: Address.parse(env.ton.router),
          response_address: Address.parse(senderAddress as string),
          custom_payload: beginCell().storeDict(Dictionary.empty()).endCell(),
          forward_ton_amount: toNano(2.0),
          either_payload: true,
          swap: {
            kind: "SwapParams",
            forward_opcode: PoolWrapper.Opcodes.Swap,
            fee: pool.fee,
            jetton1_wallet: zeroForOne
              ? Address.parse(pool.jetton1WalletAddress)
              : Address.parse(pool.jetton0WalletAddress),
            sqrt_price_limit: MIN_SQRT_RATIO,
            tick_spacing: pool.tickSpacing,
            zero_for_one: zeroForOne,
          },
        });

        let swapTx = await jettonWalletInContract!.sendTransferSwap(
          sender,
          {
            kind: "OpJettonTransferSwap",
            query_id: 0,
            jetton_amount: BigInt(jettonInAmount as string),
            to_address: Address.parse(env.ton.router),
            response_address: Address.parse(senderAddress as string),
            custom_payload: beginCell().storeDict(Dictionary.empty()).endCell(),
            forward_ton_amount: toNano(2.0),
            either_payload: true,
            swap: {
              kind: "SwapParams",
              forward_opcode: PoolWrapper.Opcodes.Swap,
              fee: pool.fee,
              jetton1_wallet: zeroForOne
                ? Address.parse(pool.jetton1WalletAddress)
                : Address.parse(pool.jetton0WalletAddress),
              sqrt_price_limit: MIN_SQRT_RATIO,
              tick_spacing: pool.tickSpacing,
              zero_for_one: zeroForOne,
            },
          },
          {
            value: toNano(2.5),
          }
        );
        const [afterSenderExecute, afterJettonReceived] = await Promise.all([
          (async () => {
            return (
              await blockchain.getContract(
                Address.parse(senderAddress as string)
              )
            ).balance;
          })(),
          (async () => {
            return (await jettonWalletOutContract!.getBalance()).amount;
          })(),
        ]);
        printTransactionFees(swapTx.transactions);

        if (returnedAmount < afterJettonReceived - beforeJettonReceived) {
          returnedAmount = afterJettonReceived - beforeJettonReceived;
          data = {
            receivedAmount: (
              afterJettonReceived - beforeJettonReceived
            ).toString(),
            executeGasConsumed: (
              afterSenderExecute - beforeSenderExecute
            ).toString(),
            zeroForOne,
            pool,
          };
        }

        if (!data) {
          throw new Error("There amount is too large for swapping");
        }
      }

      res.status(StatusCodes.OK).json({
        message: "Simulate swap successfully",
        data,
      });
    }
  );
}

export default PoolController;
