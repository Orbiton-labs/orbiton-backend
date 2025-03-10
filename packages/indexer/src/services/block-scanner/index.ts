import { LiteClient } from '@orbiton_labs/ton-lite-client';
import {
  Functions,
  liteServer_BlockData,
  liteServer_TransactionId,
  tonNode_blockIdExt,
} from '@orbiton_labs/ton-lite-client/dist/schema';
import TonRocks, { Block } from '@orbiton_labs/ton-sdk';
import BaseBlockHandler from '@src/services/block-handler/base-block-handler.service';
import { EventEmitter } from 'stream';
import Queue from 'queue';

const MASTERCHAIN_SHARD = '-9223372036854775808';
class BlockScanner extends EventEmitter {
  private blockQueue = new Queue({
    concurrency: 1,
    autostart: true,
  });
  constructor(
    protected readonly client: LiteClient,
    protected blockHandler: BaseBlockHandler,
  ) {
    super();
  }

  async parseBlock(block: liteServer_BlockData): Promise<Block> {
    try {
      const [rootCell] = await TonRocks.types.Cell.fromBoc(block.data.toString('hex'));

      // Additional check for rootHash
      const rootHash = Buffer.from(rootCell.hashes[0]).toString('hex');
      if (rootHash !== block.id.rootHash.toString('hex')) {
        throw Error('got wrong block or here was a wrong root_hash format');
      }

      const parsedBlock = TonRocks.bc.BlockParser.parseBlock(rootCell);
      return parsedBlock;
    } catch (err) {
      console.log({ err });
    }
  }

  async processMasterchainBlock(mcBlock: tonNode_blockIdExt): Promise<tonNode_blockIdExt> {
    while (true) {
      let latestMcBlock = (await this.client.getMasterchainInfo()).last;
      if (mcBlock.seqno + 1 === latestMcBlock.seqno) {
        mcBlock = latestMcBlock;
        break;
      } else if (mcBlock.seqno + 1 < latestMcBlock.seqno) {
        mcBlock = (
          await this.client.lookupBlockByID({
            workchain: -1,
            shard: MASTERCHAIN_SHARD,
            seqno: mcBlock.seqno + 1,
          })
        ).id;
        break;
      }
    }
    return mcBlock;
  }

  async processShards(seqno: number) {
    const shards = (await this.client.getFullBlock(seqno)).shards;
    await Promise.all(
      shards.map(async (shard) => {
        const { transactions, ...block } = shard;
        const blockData = await this.client.engine.query(Functions.liteServer_getBlock, {
          kind: 'liteServer.getBlock',
          id: {
            kind: 'tonNode.blockIdExt',
            ...block,
          },
        });
        const parsedBlock = await this.parseBlock(blockData);
        this.blockQueue.push(async () => {
          await this.blockHandler.execBlock(
            block as tonNode_blockIdExt,
            transactions as liteServer_TransactionId[],
            parsedBlock.info.gen_utime,
          );
        });
      }),
    );
  }

  getShardId(workchain: string, shard: string) {
    return `${workchain}:${shard}`;
  }

  async run(mcSeqno?: number) {
    let mcBlock: tonNode_blockIdExt;
    if (mcSeqno) {
      mcBlock = (
        await this.client.lookupBlockByID({
          workchain: -1,
          shard: MASTERCHAIN_SHARD,
          seqno: mcSeqno,
        })
      ).id;
    } else {
      mcBlock = (await this.client.getMasterchainInfo()).last;
    }
    let currentHandleSeqno: number;
    while (true) {
      if (currentHandleSeqno !== mcBlock.seqno) {
        this.processShards(mcBlock.seqno);
        currentHandleSeqno = mcBlock.seqno;
      }
      mcBlock = await this.processMasterchainBlock(mcBlock);
      this.emit('mc_block', mcBlock);
    }
  }
}

export default BlockScanner;
