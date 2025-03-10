import { JettonWalletWrapper } from '@orbiton_labs/v3-contracts-sdk';
import { TraceEvent } from '@src/@types';
import { InitializeEvent, MintEvent, SwapEvent } from '@src/@types/core.type';
import { tonClient } from '@src/services/ton-client';
import { Cell } from '@ton/core';

export const parseInitializeEvent = async (
  cell: Cell,
  traceEvent: TraceEvent,
): Promise<InitializeEvent> => {
  const slice = cell.asSlice();
  const firstSlice = slice.loadRef().asSlice();
  firstSlice.loadAddress();
  let jetton0WalletAddress = firstSlice.loadAddress();
  let jetton1WalletAddress = firstSlice.loadAddress();
  let jetton0WalletContract = tonClient.open(
    JettonWalletWrapper.JettonWallet.createFromAddress(jetton0WalletAddress),
  );
  let jetton1WalletContract = tonClient.open(
    JettonWalletWrapper.JettonWallet.createFromAddress(jetton1WalletAddress),
  );
  const [jetton0Data, jetton1Data] = await Promise.all([
    jetton0WalletContract.getWalletData(),
    jetton1WalletContract.getWalletData(),
  ]);
  const secondSlice = slice.loadRef().asSlice();
  let fee = secondSlice.loadUint(24);
  let tickSpacing = secondSlice.loadInt(24);
  let tick = secondSlice.loadInt(24);
  let sqrtPriceX96 = secondSlice.loadUint(160);
  return {
    ...traceEvent,
    jetton0: jetton0Data.jettonMasterAddress,
    jetton1: jetton1Data.jettonMasterAddress,
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
