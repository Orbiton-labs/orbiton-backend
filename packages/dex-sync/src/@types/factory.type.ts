import { Address } from '@ton/core';
import { TraceTx } from '.';

export type PoolCreated = TraceTx & {
  transactionHash: string;
  jetton0: Address;
  jetton1: Address;
  fee: bigint;
  tickSpacing: bigint;
  pool: Address;
};
