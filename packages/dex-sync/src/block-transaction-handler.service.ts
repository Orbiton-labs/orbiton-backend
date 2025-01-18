import { tonNode_blockIdExt } from "ton-lite-client/dist/schema";
import BaseBlockHandler from "./base-block-handler.service";
import { LiteClient } from "ton-lite-client";
import { Address } from "@ton/core";
import TonRocks from "@orbiton/ton-sdk";

class BlockTransactionHandler extends BaseBlockHandler {
  constructor(protected client: LiteClient) {
    super();
  }

  async execBlock(block: tonNode_blockIdExt) {
    let transactions = await this.client.listBlockTransactions(block);
    for (const transaction of transactions.ids) {
      let txInfo = await this.client.getAccountTransaction(
        new Address(block.workchain, transaction.account),
        transaction.lt,
        block
      );
      let txDetail = await this.parseTransaction(txInfo.transaction);
      console.dir(txDetail, { depth: null });
    }
  }

  async parseTransaction(rawTransaction: Buffer) {
    const [cell] = await TonRocks.types.Cell.fromBoc(
      rawTransaction.toString("hex")
    );
    return TonRocks.bc.BlockParser.parseTransaction(cell);
  }
}

export default BlockTransactionHandler;
