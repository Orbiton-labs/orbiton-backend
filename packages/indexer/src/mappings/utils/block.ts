import { tonNode_blockIdExt } from '@orbiton_labs/ton-lite-client/dist/schema';

export const encodeBlockId = (blockId: tonNode_blockIdExt): string => {
  let shardValue: bigint;
  try {
    if (Buffer.isBuffer(blockId.shard)) {
      const hexString = blockId.shard.toString('hex');
      shardValue = BigInt(`0x${hexString}`);
    } else if (typeof blockId.shard === 'string' && blockId.shard.match(/^[0-9a-fA-F]+$/)) {
      shardValue = BigInt(`0x${blockId.shard}`);
    } else if (typeof blockId.shard === 'string') {
      shardValue = BigInt(blockId.shard);
    } else {
      shardValue = BigInt(blockId.shard);
    }
    let encodeHexShard = shardValue & 0xffffffffffffffffn;
    return `(${blockId.workchain},${encodeHexShard.toString(16)},${blockId.seqno})`;
  } catch (error) {
    console.error('Error encoding block ID:', error);
    // Fallback to a simple string representation
    return `(${blockId.workchain},${blockId.shard},${blockId.seqno})`;
  }
};
