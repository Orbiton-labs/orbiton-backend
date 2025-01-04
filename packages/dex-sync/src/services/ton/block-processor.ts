import TonRocks, { ParsedBlock } from "@oraichain/tonbridge-utils";
import { LiteClient } from "ton-lite-client";
import {
  Functions,
  liteServer_BlockData,
  tonNode_blockIdExt,
} from "ton-lite-client/dist/schema";
import TonWeb from "tonweb";
import { Logger } from "winston";

export default class TonBlockProcessor {
  private keyBlockCacheData: {
    parsedBlock: ParsedBlock;
    rawBlockData: liteServer_BlockData;
    initialKeyBlockInformation: tonNode_blockIdExt;
  } = {
    parsedBlock: null,
    rawBlockData: null,
    initialKeyBlockInformation: null,
  };

  constructor(
    protected readonly liteClient: LiteClient,
    protected readonly tonweb: TonWeb,
    protected logger: Logger
  ) {}

  async queryKeyBlock(masterChainSeqNo: number) {
    let initBlockSeqno = masterChainSeqNo;
    while (true) {
      this.logger.info("finding key block with seqno: " + initBlockSeqno);
      const fullBlock = await this.liteClient.getFullBlock(initBlockSeqno);
      const initialBlockInformation = fullBlock.shards.find(
        (blockRes) => blockRes.seqno === initBlockSeqno
      );
      // get block
      const block = await this.liteClient.engine.query(
        Functions.liteServer_getBlock,
        {
          kind: "liteServer.getBlock",
          id: {
            kind: "tonNode.blockIdExt",
            ...initialBlockInformation,
          },
        }
      );

      const parsedBlock: ParsedBlock = await this.parseBlock(block);
      this.logger.info(
        "is parsed block a keyblock? " + parsedBlock.info.key_block
      );
      if (!parsedBlock.info.key_block) {
        // use read-through cache instead for simplicity
        if (
          this.keyBlockCacheData.initialKeyBlockInformation &&
          this.keyBlockCacheData.initialKeyBlockInformation.seqno ===
            parsedBlock.info.prev_key_block_seqno
        ) {
          this.logger.info("Current keyblock cache hit");
          // return cache instead
          return this.keyBlockCacheData;
        }
        initBlockSeqno = parsedBlock.info.prev_key_block_seqno;
        continue;
      }
      // cache our data to save bandwidth
      this.keyBlockCacheData = {
        parsedBlock,
        rawBlockData: block,
        initialKeyBlockInformation: {
          ...initialBlockInformation,
          kind: "tonNode.blockIdExt",
        },
      };
      return this.keyBlockCacheData;
    }
  }

  async getMasterchainInfo() {
    return this.liteClient.getMasterchainInfo();
  }

  async parseBlock(block: liteServer_BlockData): Promise<ParsedBlock> {
    const [rootCell] = await TonRocks.types.Cell.fromBoc(
      block.data.toString("hex")
    );

    // Additional check for rootHash
    const rootHash = Buffer.from(rootCell.hashes[0]).toString("hex");
    if (rootHash !== block.id.rootHash.toString("hex")) {
      throw Error("got wrong block or here was a wrong root_hash format");
    }

    const parsedBlock = TonRocks.bc.BlockParser.parseBlock(rootCell);
    return parsedBlock;
  }
}
