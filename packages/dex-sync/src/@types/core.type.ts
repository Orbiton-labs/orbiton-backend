import { Address } from '@ton/core';
import { TraceEvent } from '.';

export type Initialize = TraceEvent & {
  jetton0: Address;
  jetton1: Address;
  fee: bigint;
  tickSpacing: bigint;
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

export type CollectEvent = TraceEvent & {
  owner: Address;
  recipient: Address;
  tickLower: bigint;
  tickUpper: bigint;
  amount0: bigint;
  amount1: bigint;
};

export type CollectProtocolEvent = TraceEvent & {
  sender: Address;
  recipient: Address;
  amount0: bigint;
  amount1: bigint;
};
