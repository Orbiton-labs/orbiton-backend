import { tonNode_blockIdExt } from "ton-lite-client/dist/schema";
import BaseBlockHandler from "./base-block-handler.service";
import { LiteClient } from "ton-lite-client";

class BlockHandler extends BaseBlockHandler {
  constructor(protected client: LiteClient) {
    super();
  }

  async execBlock(block: tonNode_blockIdExt) {
    console.log(block);
    let transactions = await this.client.listBlockTransactions(block);
    for (const transaction of transactions.ids) {
    }
  }
}

export default BlockHandler;
