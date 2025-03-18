import { JettonWalletWrapper } from '@orbiton_labs/v3-contracts-sdk';
import { TraceEvent } from '@src/@types';
import {
  BurnEvent,
  CollectEvent,
  InitializeEvent,
  MintEvent,
  SwapEvent,
} from '@src/@types/core.type';
import { sortAddress } from '@src/mappings/utils/address';
import { Cell } from '@ton/core';

export const parseInitializeEvent = (cell: Cell, traceEvent: TraceEvent): InitializeEvent => {
  const slice = cell.asSlice();
  const firstSlice = slice.loadRef().asSlice();
  firstSlice.loadAddress();
  let jetton0 = firstSlice.loadAddress();
  let jetton1 = firstSlice.loadAddress();
  const [jetton0WalletAddress, jetton1WalletAddress] = sortAddress(jetton0, jetton1);
  const secondSlice = slice.loadRef().asSlice();
  let fee = secondSlice.loadUint(24);
  let tickSpacing = secondSlice.loadInt(24);
  let tick = secondSlice.loadInt(24);
  let sqrtPriceX96 = secondSlice.loadUintBig(160);
  return {
    ...traceEvent,
    jetton0: jetton0WalletAddress,
    jetton1: jetton1WalletAddress,
    fee: BigInt(fee),
    tickSpacing: BigInt(tickSpacing),
    sqrtPriceX96,
    tick: BigInt(tick),
  };
};

export const parseMintEvent = (cell: Cell, traceEvent: TraceEvent): MintEvent => {
  const slice = cell.asSlice();
  let sender = slice.loadAddress();
  let owner = slice.loadAddress();
  let tickLower = slice.loadInt(24);
  let tickUpper = slice.loadInt(24);
  let amount = slice.loadUintBig(128);
  const amountSlice = slice.loadRef().asSlice();
  let amount0 = amountSlice.loadUintBig(128);
  let amount1 = amountSlice.loadUintBig(128);
  return {
    ...traceEvent,
    sender,
    owner,
    tickLower: BigInt(tickLower),
    tickUpper: BigInt(tickUpper),
    amount,
    amount0,
    amount1,
  };
};

export const parseSwapEvent = (cell: Cell, traceEvent: TraceEvent): SwapEvent => {
  const slice = cell.asSlice();
  const sender = slice.loadAddress();
  const recipient = slice.loadAddress();
  const firstSlice = slice.loadRef().asSlice();
  const amount0 = firstSlice.loadIntBig(256);
  const amount1 = firstSlice.loadIntBig(256);
  const sqrtPriceX96 = firstSlice.loadUintBig(160);
  const liquidity = firstSlice.loadUintBig(128);
  const tick = firstSlice.loadInt(24);
  const secondSlice = slice.loadRef().asSlice();
  const protocolFeesJetton0 = secondSlice.loadIntBig(160);
  const protocolFeesJetton1 = secondSlice.loadIntBig(160);
  return {
    ...traceEvent,
    amount0,
    amount1,
    liquidity,
    protocolFeesJetton0,
    protocolFeesJetton1,
    recipient,
    sender,
    sqrtPriceX96,
    tick: BigInt(tick),
  };
};

export const parseBurnEvent = (cell: Cell, traceEvent: TraceEvent): BurnEvent => {
  const slice = cell.asSlice();
  const owner = slice.loadAddress();
  const tickLower = slice.loadInt(24);
  const tickUpper = slice.loadInt(24);
  const liquidityDelta = slice.loadUintBig(128);
  const amount0 = slice.loadUintBig(256);
  const amount1 = slice.loadUintBig(256);
  return {
    ...traceEvent,
    amount: liquidityDelta,
    amount0: amount0,
    amount1: amount1,
    owner,
    tickLower: BigInt(tickLower),
    tickUpper: BigInt(tickUpper),
  };
};

export const parseCollectEvent = (cell: Cell, traceEvent: TraceEvent): CollectEvent => {
  const slice = cell.asSlice();
  const owner = slice.loadAddress();
  const recipient = slice.loadAddress();
  const tickLower = slice.loadInt(24);
  const tickUpper = slice.loadInt(24);
  const amount0 = slice.loadIntBig(128);
  const amount1 = slice.loadIntBig(128);
  return {
    ...traceEvent,
    amount0,
    amount1,
    owner,
    recipient,
    tickLower: BigInt(tickLower),
    tickUpper: BigInt(tickUpper),
  };
};
