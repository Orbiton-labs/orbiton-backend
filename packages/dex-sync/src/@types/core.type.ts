import { Address } from '@ton/core';
import { TraceEvent } from '.';

export type Initialize = TraceEvent & {
  sqrtPriceX96: bigint;
  tick: bigint;
};

export type MintEvent = TraceEvent & {
  sender: Address;
  owner: Address;
  tickLower: bigint;
  tickUpper: bigint;
  amount: bigint;
  amount0: bigint;
  amount1: bigint;
};

export type SwapEvent = TraceEvent & {
  sender: Address;
  recipient: Address;
  amount0: bigint;
  amount1: bigint;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  tick: bigint;
  protocolFeesJetton0: bigint;
  protocolFeesJetton1: bigint;
};

export type BurnEvent = TraceEvent & {
  owner: Address;
  tickLower: bigint;
  tickUpper: bigint;
  amount: bigint;
  amount0: bigint;
  amount1: bigint;
};
