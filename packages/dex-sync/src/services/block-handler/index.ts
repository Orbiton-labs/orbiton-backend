import { tonNode_blockIdExt } from '@orbiton/ton-lite-client/dist/schema';
import BaseBlockHandler from './base-block-handler.service';
import { LiteClient } from '@orbiton/ton-lite-client';
const fs = require('fs');

class BlockTransactionHandler extends BaseBlockHandler {
  mappedTxs = {};
  constructor(protected client: LiteClient) {
    super();
  }

  async execBlock(block: tonNode_blockIdExt) {
    let transactions = await this.client.listBlockTransactions(block);
    for (const transaction of transactions.ids) {
      if (block.workchain == -1) {
        if (!!this.mappedTxs[transaction.hash.toString('hex')]) {
          console.log(
            `Duplicate transaction with masterchain ${transaction.hash.toString('hex')}, writed on workchain ${this.mappedTxs[transaction.hash.toString('hex')]}`,
          );
        }
        // console.log(transaction.hash.toString("hex"));
        // fs.appendFileSync(
        //   "transactions.log",
        //   transaction.hash.toString("hex") + "\n"
        // );
        // console.log(transaction.account);
        // let txInfo = await this.client.getAccountTransaction(
        //   new Address(block.workchain, transaction.account),
        //   transaction.lt,
        //   block
        // );
        // const txDetail = loadTransaction(
        //   Cell.fromBoc(txInfo.transaction)[0].asSlice()
        // );

        // console.log(txDetail.hash().toString("hex"));
        // console.log(txDetail);
      }
      console.log(`Transaction ${transaction.hash.toString('hex')} from block ${block.workchain}`);
      this.mappedTxs[transaction.hash.toString('hex')] = block.workchain;
    }
  }
}

export default BlockTransactionHandler;
