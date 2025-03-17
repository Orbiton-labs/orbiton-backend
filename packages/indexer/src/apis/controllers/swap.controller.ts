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
  PoolMessageBuilder,
  PoolWrapper,
} from '@orbiton_labs/v3-contracts-sdk';
import { MAX_SQRT_RATIO, MIN_SQRT_RATIO } from '@src/constants';
import { Chain } from '@orbiton_labs/v3-contracts-sdk/build/constants';
import { tonApiClient } from '@src/services/ton-api';
import { WalletVersion } from '@orbiton_labs/v3-contracts-sdk/build/@types';

export const simulateSwap = async (req: Request, res: Response) => {
  const { offerJettonAddress, askJettonAddress, offerAmount, senderAddress } = req.query as SwapDto;
  const pools = await db.query.pool.findMany({
    where: or(
      and(
        eq(schema.pool.jetton0Id, Address.parse(offerJettonAddress).toString()),
        eq(schema.pool.jetton1Id, Address.parse(askJettonAddress).toString()),
      ),
      and(
        eq(schema.pool.jetton0Id, Address.parse(askJettonAddress).toString()),
        eq(schema.pool.jetton1Id, Address.parse(offerJettonAddress).toString()),
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
  let messages;
  for (const pool of pools) {
    const zeroForOne = pool.jetton0Id === offerJettonAddress && pool.jetton1Id === askJettonAddress;
    const poolContract = tonClient.open(PoolWrapper.Pool.createFromAddress(Address.parse(pool.id)));
    const result = await poolContract.getSimulateSwap(
      BigInt(offerAmount),
      zeroForOne ? -1n : 0n,
      zeroForOne ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n,
      Address.parse(senderAddress),
    );
    const expectedReturnAmount = zeroForOne ? result.amount1 : result.amount0;

    if (expectedReturnAmount > returnAmount) {
      returnAmount = expectedReturnAmount;

      const [offerJetton, askJetton] = zeroForOne
        ? [pool.jetton0, pool.jetton1]
        : [pool.jetton1, pool.jetton0];
      const offerJettonEntity = new Jetton(
        offerJetton.id,
        offerJetton.decimals,
        offerJetton.symbol,
      );
      const askJettonEntity = new Jetton(askJetton.id, askJetton.decimals, askJetton.symbol);
      await Promise.all([
        offerJettonEntity.setWalletAddress(tonClient, Address.parse(senderAddress)),
        askJettonEntity.setWalletAddress(tonClient, Address.parse(env.indexer.routerAddress)),
      ]);
      const offerJettonAmount = JettonAmount.fromRawAmount(offerJettonEntity, BigInt(offerAmount));
      const swapMessages = await PoolMessageBuilder.createExactInSwapMessage(
        offerJettonAmount,
        askJettonEntity,
        Number(pool.tickSpacing),
        Number(pool.feeTier),
        BigInt(pool.sqrtPrice),
        Address.parse(senderAddress),
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
  }

  res.status(200).json({
    data: {
      returnAmount: returnAmount.toString(),
      messages,
    },
  });
  return;
};
