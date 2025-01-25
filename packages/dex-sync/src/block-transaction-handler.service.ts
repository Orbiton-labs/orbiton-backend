import { tonNode_blockIdExt } from "@orbiton/ton-lite-client/dist/schema";
import BaseBlockHandler from "./base-block-handler.service";
import { LiteClient } from "@orbiton/ton-lite-client";
import { Address, Cell, loadTransaction } from "@ton/core";
const fs = require("fs");

class BlockTransactionHandler extends BaseBlockHandler {
  constructor(protected client: LiteClient) {
    super();
  }

  async execBlock(block: tonNode_blockIdExt) {
    let transactions = await this.client.listBlockTransactions(block);
    console.log(block);
    for (const transaction of transactions.ids) {
      // console.log(transaction.hash.toString("hex"));
      fs.appendFileSync(
        "transactions.log",
        transaction.hash.toString("hex") + "\n"
      );
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
  }
}

export default BlockTransactionHandler;
