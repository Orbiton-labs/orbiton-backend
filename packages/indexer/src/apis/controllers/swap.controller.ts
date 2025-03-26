import { Request, Response } from 'express';
import { SwapDto } from '../dtos/swap.dto';
import { db } from '@src/db';
import * as schema from '@src/models';
import { and, eq, or } from 'drizzle-orm';
import env from '@src/configs/env';
import { Address } from '@ton/core';
import { tonClient } from '@src/services/ton-client';
import {
  Jetton,
  JettonAmount,
  Pool,
  PoolMessageBuilder,
  Tick,
} from '@orbiton_labs/v3-contracts-sdk';
import { MAX_SQRT_RATIO, MIN_SQRT_RATIO } from '@src/constants';
import { Chain } from '@orbiton_labs/v3-contracts-sdk/build/constants';
import { FeeAmount } from '@orbiton_labs/v3-contracts-sdk/build/@types';

export const simulateSwap = async (req: Request, res: Response) => {
  const { offerJettonAddress, askJettonAddress, offerAmount, senderAddress } = req.query as SwapDto;
  const rawOfferJettonAddress = Address.parse(offerJettonAddress).toString();
  const rawAskJettonAddress = Address.parse(askJettonAddress).toString();
  const pools = await db.query.pool.findMany({
    where: or(
      and(
        eq(schema.pool.jetton0Id, rawOfferJettonAddress),
        eq(schema.pool.jetton1Id, rawAskJettonAddress),
      ),
      and(
        eq(schema.pool.jetton0Id, rawAskJettonAddress),
        eq(schema.pool.jetton1Id, rawOfferJettonAddress),
      ),
    ),
    with: {
      jetton0: true,
      jetton1: true,
    },
  });

  if (pools.length === 0) {
    res.status(404).json({
      error: 'There is no pool for this swap',
    });
    return;
  }

  if (BigInt(offerAmount) <= 0n) {
    res.status(400).json({
      error: 'Offer amount must be greater than 0',
    });
    return;
  }

  let returnAmount = 0n;
  let messages: any;
  let chosenOfferJettonEntity: Jetton;
  let chosenAskJettonEntity: Jetton;
  let chosenPool: schema.Pool;
  let chosenZeroForOne: boolean;
  let chosenIsTonToJetton: boolean;

  for (const pool of pools) {
    const zeroForOne =
      pool.jetton0Id === rawOfferJettonAddress && pool.jetton1Id === rawAskJettonAddress;
    const isTonToJetton = rawOfferJettonAddress === env.indexer.pTonAddress;

    const [offerJetton, askJetton] = zeroForOne
      ? [pool.jetton0, pool.jetton1]
      : [pool.jetton1, pool.jetton0];
    const offerJettonEntity = new Jetton(offerJetton.id, offerJetton.decimals, offerJetton.symbol);
    const askJettonEntity = new Jetton(askJetton.id, askJetton.decimals, askJetton.symbol);

    const ticks = await db.query.tick.findMany({
      where: eq(schema.tick.poolId, pool.id),
    });
    const ticksData = ticks
      .sort((a, b) => Number(a.tickIdx - b.tickIdx))
      .map(
        (tick) =>
          new Tick({
            index: Number(tick.tickIdx),
            liquidityGross: tick.liquidityGross,
            liquidityNet: tick.liquidityNet,
          }),
      );
    const poolEntity = new Pool(
      offerJettonEntity,
      askJettonEntity,
      Number(pool.feeTier) as FeeAmount,
      pool.sqrtPrice,
      pool.liquidity,
      Number(pool.tick),
      Number(pool.tickSpacing),
      ticksData,
      false,
    );
    const result = await poolEntity.swap(
      zeroForOne,
      BigInt(offerAmount),
      zeroForOne ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n,
    );
    const expectedReturnAmount =
      result.amountCalculated < 0n ? 0n - result.amountCalculated : result.amountCalculated;

    if (expectedReturnAmount > returnAmount) {
      returnAmount = expectedReturnAmount;
      chosenOfferJettonEntity = offerJettonEntity;
      chosenAskJettonEntity = askJettonEntity;
      chosenPool = pool;
      chosenZeroForOne = zeroForOne;
      chosenIsTonToJetton = isTonToJetton;
    }
  }

  if (chosenOfferJettonEntity && chosenAskJettonEntity && chosenPool) {
    await Promise.all([
      chosenOfferJettonEntity.setWalletAddress(
        tonClient,
        chosenIsTonToJetton
          ? Address.parse(env.indexer.routerAddress)
          : Address.parse(senderAddress),
      ),
      chosenAskJettonEntity.setWalletAddress(tonClient, Address.parse(env.indexer.routerAddress)),
    ]);
    const offerJettonAmount = JettonAmount.fromRawAmount(
      chosenOfferJettonEntity,
      BigInt(offerAmount),
    );
    const swapMessages = PoolMessageBuilder.createExactInSwapMessage(
      offerJettonAmount,
      chosenAskJettonEntity,
      Number(chosenPool.tickSpacing),
      Number(chosenPool.feeTier),
      chosenZeroForOne ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n,
      Address.parse(senderAddress),
      Number(chosenZeroForOne ? -1 : 0),
      chosenIsTonToJetton,
      env.server.network === 'mainnet' ? Chain.Mainnet : Chain.Testnet,
      {
        ROUTER: env.indexer.routerAddress,
        PTON_ROUTER_WALLET: env.indexer.pTonRouterAddress,
      },
    );
    messages = swapMessages.map((message) => ({
      to: message.to.toString(),
      value: message.value.toString(),
      body: message.body.toBoc().toString('hex'),
    }));
  }

  res.status(200).json({
    data: {
      returnAmount: returnAmount.toString(),
      messages,
    },
  });
  return;
};
