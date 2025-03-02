import { tonNode_blockIdExt } from '@orbiton_labs/ton-lite-client/dist/schema';

export const encodeBlockId = (blockId: tonNode_blockIdExt): string => {
  let encodeHexShard = BigInt(blockId.shard) & 0xffffffffffffffffn;
  return `(${blockId.workchain},${encodeHexShard.toString(16)},${blockId.seqno})`;
};
