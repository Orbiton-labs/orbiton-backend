import { JettonWalletWrapper } from '@orbiton_labs/v3-contracts-sdk';
import { TraceEvent } from '@src/@types';
import {
  BurnEvent,
  CollectEvent,
  InitializeEvent,
  MintEvent,
  SwapEvent,
} from '@src/@types/core.type';
import { tonClient } from '@src/services/ton-client';
import { Cell } from '@ton/core';

export const parseInitializeEvent = (cell: Cell, traceEvent: TraceEvent): InitializeEvent => {
  const slice = cell.asSlice();
  const firstSlice = slice.loadRef().asSlice();
  let jettonMasterRef = firstSlice.loadRef().asSlice();
  let jetton0MasterAddress = jettonMasterRef.loadAddress();
  let jetton1MasterAddress = jettonMasterRef.loadAddress();
  const secondSlice = slice.loadRef().asSlice();
  let fee = secondSlice.loadUint(24);
  let tickSpacing = secondSlice.loadInt(24);
  let tick = secondSlice.loadInt(24);
  let sqrtPriceX96 = secondSlice.loadUint(160);
  return {
    ...traceEvent,
    jetton0: jetton0MasterAddress,
    jetton1: jetton1MasterAddress,
    fee: BigInt(fee),
    tickSpacing: BigInt(tickSpacing),
    sqrtPriceX96: BigInt(sqrtPriceX96),
    tick: BigInt(tick),
  };
};

export const parseMintEvent = (cell: Cell, traceEvent: TraceEvent): MintEvent => {
  const slice = cell.asSlice();
  let sender = slice.loadAddress();
  let owner = slice.loadAddress();
  let tickLower = slice.loadInt(24);
  let tickUpper = slice.loadInt(24);
  let amount = slice.loadUint(128);
  let amount0 = slice.loadUint(128);
  let amount1 = slice.loadUint(128);
  return {
    ...traceEvent,
    sender,
    owner,
    tickLower: BigInt(tickLower),
    tickUpper: BigInt(tickUpper),
    amount: BigInt(amount),
    amount0: BigInt(amount0),
    amount1: BigInt(amount1),
  };
};

export const parseSwapEvent = (cell: Cell, traceEvent: TraceEvent): SwapEvent => {
  const slice = cell.asSlice();
  const sender = slice.loadAddress();
  const recipient = slice.loadAddress();
  const firstSlice = slice.loadRef().asSlice();
  const amount0 = firstSlice.loadInt(256);
  const amount1 = firstSlice.loadInt(256);
  const sqrtPriceX96 = firstSlice.loadUint(160);
  const liquidity = firstSlice.loadUint(128);
  const tick = firstSlice.loadInt(24);
  const secondSlice = slice.loadRef().asSlice();
  const protocolFeesJetton0 = secondSlice.loadInt(160);
  const protocolFeesJetton1 = secondSlice.loadInt(160);
  return {
    ...traceEvent,
    amount0: BigInt(amount0),
    amount1: BigInt(amount1),
    liquidity: BigInt(liquidity),
    protocolFeesJetton0: BigInt(protocolFeesJetton0),
    protocolFeesJetton1: BigInt(protocolFeesJetton1),
    recipient,
    sender,
    sqrtPriceX96: BigInt(sqrtPriceX96),
    tick: BigInt(tick),
  };
};

export const parseBurnEvent = (cell: Cell, traceEvent: TraceEvent): BurnEvent => {
  const slice = cell.asSlice();
  const owner = slice.loadAddress();
  const tickLower = slice.loadInt(24);
  const tickUpper = slice.loadInt(24);
  const liquidityDelta = slice.loadUint(128);
  const amount0 = slice.loadUint(256);
  const amount1 = slice.loadUint(256);
  return {
    ...traceEvent,
    amount: BigInt(liquidityDelta),
    amount0: BigInt(amount0),
    amount1: BigInt(amount1),
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
  const amount0 = slice.loadInt(128);
  const amount1 = slice.loadInt(128);
  return {
    ...traceEvent,
    amount0: BigInt(amount0),
    amount1: BigInt(amount1),
    owner,
    recipient,
    tickLower: BigInt(tickLower),
    tickUpper: BigInt(tickUpper),
  };
};
