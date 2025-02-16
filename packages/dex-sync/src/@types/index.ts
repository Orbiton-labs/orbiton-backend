import { tonNode_blockIdExt } from '@orbiton/ton-lite-client/dist/schema';

export * from './factory.type';

export type TraceTx = {
  transactionHash: string;
  block: tonNode_blockIdExt;
};
