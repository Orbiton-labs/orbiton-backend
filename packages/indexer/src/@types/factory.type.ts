import { Address } from '@ton/core';
import { TraceEvent } from '.';

export type PoolCreated = TraceEvent & {
  transactionHash: string;
  jetton0: Address;
  jetton1: Address;
  fee: bigint;
  tickSpacing: bigint;
  poolAddress: Address;
};
