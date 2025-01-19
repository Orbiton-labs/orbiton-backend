import { tonNode_blockIdExt } from "@orbiton/ton-lite-client/dist/schema";
import BaseBlockHandler from "./base-block-handler.service";
import { LiteClient } from "@orbiton/ton-lite-client";
import { Address } from "@ton/core";
import TonRocks, { Transaction } from "@orbiton/ton-sdk";

class BlockTransactionHandler extends BaseBlockHandler {
  constructor(protected client: LiteClient) {
    super();
  }

  async execBlock(block: tonNode_blockIdExt) {
    // this.client.engine.query("");
    let transactions = await this.client.listBlockTransactions(block);
    console.log("Transactions:", transactions);
    // for (const transaction of transactions.ids) {
    //   let txInfo = await this.client.getAccountTransaction(
    //     new Address(block.workchain, transaction.account),
    //     transaction.lt,
    //     block
    //   );
    //   let txDetail = await this.parseTransaction(txInfo.transaction);
    //   console.log("Transaction Detail:", Object.keys(txDetail));
    //   console.log("In message:", Object.keys(txDetail?.in_msg || {}));
    //   console.log("Out message:", Object.keys(txDetail?.out_msgs || {}));
    // }
  }

  async parseTransaction(rawTransaction: Buffer): Promise<Transaction> {
    const [cell] = await TonRocks.types.Cell.fromBoc(
      rawTransaction.toString("hex")
    );
    return TonRocks.bc.BlockParser.parseTransaction(cell);
  }
}

export default BlockTransactionHandler;
