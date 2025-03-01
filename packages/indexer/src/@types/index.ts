import { tonNode_blockIdExt } from '@orbiton/ton-lite-client/dist/schema';
import { Address } from '@ton/core';

export * from './factory.type';

export type TraceTx = {
  from: Address;
  to: Address;
  hash: string;
};

export type TraceBlock = {
  id: tonNode_blockIdExt;
  timestamp: number;
};

export type TraceEvent = {
  address: Address;
  transaction: TraceTx;
  block: TraceBlock;
};
