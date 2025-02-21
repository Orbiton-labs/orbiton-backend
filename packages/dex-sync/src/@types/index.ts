import { tonNode_blockIdExt } from '@orbiton/ton-lite-client/dist/schema';
import { Address } from '@ton/core';

export * from './factory.type';

export type TraceTx = {
  address: Address;
  transactionHash: string;
  block: tonNode_blockIdExt;
  // NOTICE: this timestamp must be converted to be in milliseconds
  blockTimestamp: number;
};
