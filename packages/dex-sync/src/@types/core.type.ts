import { TraceTx } from '.';

export type Initialize = TraceTx & {
  poolAddress: string;
  sqrtPriceX96: bigint;
  tick: bigint;
};
