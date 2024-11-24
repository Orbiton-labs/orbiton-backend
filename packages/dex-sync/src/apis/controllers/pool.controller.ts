import { catchAsync } from "../../utils";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import PoolRepository from "../repositories/pool.repository";
import {
  Blockchain,
  printTransactionFees,
  RemoteBlockchainStorage,
  wrapTonClient4ForRemote,
} from "@ton/sandbox";
import {
  Address,
  beginCell,
  Cell,
  Dictionary,
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
              endpoint: await getHttpV4Endpoint({
                network: env.server.network,
              }),
            })
          )
        ),
      });
      let sender = blockchain.sender(Address.parse(senderAddress as string));
      const allPoolsOne = await PoolRepository.getAll({
        jetton0MasterAddress: jettonInAddress as string,
        jetton1MasterAddress: jettonOutAddress as string,
      });
      const allPoolsTwo = await PoolRepository.getAll({
        jetton0MasterAddress: jettonOutAddress as string,
        jetton1MasterAddress: jettonInAddress as string,
      });
      const allPools = [...allPoolsOne, ...allPoolsTwo];

      const jettonMasterInContract = blockchain.openContract(
        JettonMinterWrapper.JettonMinter.createFromAddress(
          Address.parse(jettonInAddress as string)
        )
      );
      const jettonWalletInAddress =
        await jettonMasterInContract.getWalletAddress(sender.address);
      const jettonWalletInContract = blockchain.openContract(
        JettonWalletWrapper.JettonWallet.createFromAddress(
          jettonWalletInAddress
        )
      );

      const jettonMasterOutContract = blockchain.openContract(
        JettonMinterWrapper.JettonMinter.createFromAddress(
          Address.parse(jettonOutAddress as string)
        )
      );
      const jettonWalletOutAddress =
        await jettonMasterOutContract.getWalletAddress(sender.address);
      const jettonWalletOutContract = blockchain.openContract(
        JettonWalletWrapper.JettonWallet.createFromAddress(
          jettonWalletOutAddress
        )
      );

      // find best returned simulate
      let returnedAmount = 0n;
      let data: any = null;
      for (const pool of allPools) {
        const zeroForOne =
          jettonInAddress === pool.jetton0MasterAddress ? -1 : 0;

        let beforeJettonReceived = 0n;
        let afterJettonReceived = 0n;
        let beforeSenderBalance = (
          await blockchain.getContract(Address.parse(senderAddress as string))
        ).balance;
        beforeJettonReceived = (await jettonWalletOutContract!.getBalance())
          .amount;
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
              jetton1_wallet: Address.parse(pool.jetton1WalletAddress),
              sqrt_price_limit: MIN_SQRT_RATIO,
              tick_spacing: pool.tickSpacing,
              zero_for_one: zeroForOne,
            },
          },
          {
            value: toNano(2.5),
          }
        );
        afterJettonReceived = (await jettonWalletOutContract!.getBalance())
          .amount;
        printTransactionFees(swapTx.transactions);
        let afterSenderBalance = (
          await blockchain.getContract(Address.parse(senderAddress as string))
        ).balance;

        if (returnedAmount < afterJettonReceived - beforeJettonReceived) {
          returnedAmount = afterJettonReceived - beforeJettonReceived;
          data = {
            receivedAmount: (
              afterJettonReceived - beforeJettonReceived
            ).toString(),
            executeGasConsumed: (
              afterSenderBalance - beforeSenderBalance
            ).toString(),
            zeroForOne,
            pool,
          };
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
