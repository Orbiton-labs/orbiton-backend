import { TraceTx } from '.';

export type Initialize = TraceTx & {
  sqrtPriceX96: bigint;
  tick: bigint;
};

export type MintEvent = TraceTx & {
  sender: string;
  owner: string;
  tickLower: bigint;
  tickUpper: bigint;
  amount: bigint;
  amount0: bigint;
  amount1: bigint;
};
