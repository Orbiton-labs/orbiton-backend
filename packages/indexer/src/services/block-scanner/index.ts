import { setTimeout } from 'timers/promises';
import { LiteClient } from '@orbiton/ton-lite-client';
import {
  Functions,
  liteServer_BlockData,
  tonNode_blockIdExt,
} from '@orbiton/ton-lite-client/dist/schema';
import { Mutex } from 'async-mutex';
import TonRocks, { Block } from '@orbiton/ton-sdk';
import BaseBlockHandler from '@src/services/block-handler/base-block-handler.service';
import { EventEmitter } from 'stream';

const MASTERCHAIN_SHARD = '-9223372036854775808';

interface ShardStorage {
  [key: string]: number;
}

class BlockScanner extends EventEmitter {
  blockMutex: Mutex = new Mutex();
  blockStorage: tonNode_blockIdExt[] = [];
  shardStorage: ShardStorage = {};

  constructor(
    protected readonly client: LiteClient,
    protected blockHandler: BaseBlockHandler,
  ) {
    super();
  }

  async getNotSeenShards(shard: { workchain: string; shard: string; seqno: number }) {
    if (this.shardStorage[this.getShardId(shard.workchain, shard.shard)] == shard.seqno) {
      return;
    }

    let shardBlockId = await this.client.lookupBlockByID({
      workchain: parseInt(shard.workchain),
      shard: shard.shard,
      seqno: shard.seqno,
    });
    const block = await this.client.engine.query(Functions.liteServer_getBlock, {
      kind: 'liteServer.getBlock',
      id: {
        kind: 'tonNode.blockIdExt',
        ...shardBlockId.id,
      },
    });
    let parsedBlock = await this.parseBlock(block);
    let prevRef = (parsedBlock.info as any)?.prev_ref;
    if (!prevRef) {
      return;
    }
    if (prevRef.type == 'prev_blk_info') {
      let { seq_no } = prevRef.prev;
      let prevShard = parsedBlock.info.after_split
        ? this.getParentShard(BigInt(shard.shard)).toString()
        : shard.shard;
      this.getNotSeenShards({
        workchain: shard.workchain,
        shard: prevShard,
        seqno: seq_no,
      });
    } else {
      let prev1 = prevRef.prev1;
      let prev2 = prevRef.prev2;
      this.getNotSeenShards({
        workchain: shard.workchain,
        shard: this.getChildShard(BigInt(prev1.shard), true).toString(),
        seqno: prev1.seq_no,
      });
      this.getNotSeenShards({
        workchain: shard.workchain,
        shard: this.getChildShard(BigInt(prev1.shard), false).toString(),
        seqno: prev2.seq_no,
      });
    }
    this.blockMutex.acquire().then(() => {
      this.blockStorage.push(shardBlockId.id);
      this.blockMutex.release();
    });
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

  async processBlock() {
    while (true) {
      await this.blockMutex.acquire();
      let block = this.blockStorage.shift();
      this.blockMutex.release();
      if (block) {
        await this.blockHandler.execBlock(block);
      }
      await setTimeout(50);
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
      await setTimeout(100);
    }
    return mcBlock;
  }

  async processShards(block: tonNode_blockIdExt, handleUnseenShards = true) {
    let shardInfos = await this.client.getAllShardsInfo({
      ...block,
    });
    for (let [workchain, cluster] of Object.entries(shardInfos.shards)) {
      for (let [shard, seqno] of Object.entries(cluster)) {
        if (handleUnseenShards) {
          await this.getNotSeenShards({
            workchain,
            shard,
            seqno,
          });
        }

        this.shardStorage = {
          ...this.shardStorage,
          [this.getShardId(workchain, shard)]: seqno,
        };
      }
    }
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
    let mcblockPrev = (
      await this.client.lookupBlockByID({
        workchain: -1,
        shard: MASTERCHAIN_SHARD,
        seqno: mcBlock.seqno - 1,
      })
    ).id;
    this.processBlock();
    await this.processShards(mcblockPrev, false);
    while (true) {
      await this.blockMutex.acquire();
      this.blockStorage.push(mcBlock);
      this.blockMutex.release();
      await this.processShards(mcBlock);
      mcBlock = await this.processMasterchainBlock(mcBlock);
    }
  }

  getChildShard(shard: bigint, left: boolean): bigint {
    let x = this.lowerBit64(shard);
    return left ? shard - x : shard + x;
  }

  getParentShard(shard: bigint): bigint {
    let x = this.lowerBit64(shard);
    return (shard - x) | (x << 1n);
  }

  lowerBit64(value: bigint): bigint {
    return value & (~value + 1n);
  }
}

export default BlockScanner;
