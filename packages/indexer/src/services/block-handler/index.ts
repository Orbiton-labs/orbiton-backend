import {
  liteServer_TransactionId,
  tonNode_blockIdExt,
} from '@orbiton_labs/ton-lite-client/dist/schema';
import BaseBlockHandler from './base-block-handler.service';
import { LiteClient } from '@orbiton_labs/ton-lite-client';
import { Address, Cell, loadTransaction } from '@ton/core';
import { PoolWrapper, RouterWrapper } from '@orbiton_labs/v3-contracts-sdk';
import { parseInitializeEvent, parseMintEvent, parseSwapEvent } from '@src/utils/event.util';
import { ZERO_ADDRESS } from '@src/constants';
import { handleMint } from '@src/mappings/core/mint';
import { handleInitialize } from '@src/mappings/core/initalize';
import { handleSwap } from '@src/mappings/core/swap';

class BlockTransactionHandler extends BaseBlockHandler {
  constructor(protected client: LiteClient) {
    super();
  }

  async execBlock(
    block: tonNode_blockIdExt,
    transactions: liteServer_TransactionId[],
    blockTimestamp: number,
  ) {
    let txInfos = await Promise.all(
      transactions.map((transaction) =>
        this.client.getAccountTransaction(
          new Address(block.workchain, transaction.account),
          transaction.lt,
          block,
        ),
      ),
    );
    for (const txInfo of txInfos) {
      const txDetail = loadTransaction(Cell.fromBoc(txInfo.transaction)[0].asSlice());
      console.log(`${txDetail.hash().toString('hex')}`);
      if (txDetail.inMessage) {
        const inMsg = txDetail.inMessage;
        const address = (inMsg.info.dest as Address) || Address.parse(ZERO_ADDRESS);
        const traceTx = {
          from: inMsg.info.src as Address,
          to: inMsg.info.dest as Address,
          hash: txDetail.hash().toString('hex'),
        };
        const traceBlock = {
          id: block,
          timestamp: blockTimestamp * 1000,
        };
        let opcode =
          inMsg.body.asSlice().remainingBits < 32 ? null : inMsg.body.asSlice().loadUint(32);
        const outMsgs = txDetail.outMessages.values();
        const externalOutMsgs = outMsgs.filter((msg) => {
          return msg.info.type == 'external-out';
        });
        if (externalOutMsgs.length == 0) {
          continue;
        }
        let msg: any;
        let msgBody: any;
        switch (opcode) {
          case RouterWrapper.Opcodes.CallbackCreatePool:
            msg = externalOutMsgs[0];
            msgBody = msg.body;
            let initializeEvent = await parseInitializeEvent(msgBody, {
              address,
              transaction: traceTx,
              block: traceBlock,
            });
            await handleInitialize(initializeEvent).catch((err) => {
              console.log('Error:', err?.stack);
            });
            break;
          case PoolWrapper.Opcodes.CallBackMintPosition:
            msg = externalOutMsgs[0];
            msgBody = msg.body;
            let mintEvent = parseMintEvent(msgBody, {
              address,
              transaction: traceTx,
              block: traceBlock,
            });
            await handleMint(mintEvent).catch((err) => {
              console.log('Error:', err?.stack);
            });
            break;
          case PoolWrapper.Opcodes.Swap:
            msg = externalOutMsgs[0];
            msgBody = msg.body;
            let swapEvent = parseSwapEvent(msgBody, {
              address,
              transaction: traceTx,
              block: traceBlock,
            });
            await handleSwap(swapEvent).catch((err) => {
              console.log('Error:', err?.stack);
            });
            break;
          default:
            break;
        }
      }
    }
  }
}

export default BlockTransactionHandler;
