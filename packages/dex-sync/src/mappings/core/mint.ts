import { MintEvent } from '@src/@types/core.type';
import { db } from '@src/db';
import { eq } from 'drizzle-orm';
import * as schema from '@src/models/index';
import { convertJettonToDecimal, getOrLoadJetton, updateJettonDayData } from '../utils/jetton';
import { Address } from '@ton/core';
import { Router } from '@src/models/router';
import BigDecimal from 'js-big-decimal';
import { updateDerivedTVLAmounts } from '../utils/tvl';
import { ONE_BI } from '@src/constants';
import { loadTransaction } from '../utils';
import { createTick } from '../utils/tick';
import { updateRouterDayData } from '../utils/router';
import { updatePoolDayData } from '../utils/pool';
import { updateTickFeeVarsAndSave } from '../utils/ton';

export const handleMint = async (event: MintEvent) => {
  let router = (await db.query.router.findFirst({})) as Router | undefined;
  if (!router) {
    return;
  }
  let pool = await db.query.pool.findFirst({
    where: eq(schema.pool.address, event.address.toString()),
    with: {
      jetton0: true,
      jetton1: true,
    },
  });
  if (!pool) {
    return;
  }
  let jetton0 = await getOrLoadJetton(Address.parse(pool.jetton0.address));
  let jetton1 = await getOrLoadJetton(Address.parse(pool.jetton1.address));
  let amount0 = convertJettonToDecimal(event.amount0, jetton0);
  let amount1 = convertJettonToDecimal(event.amount1, jetton1);
  let amountUSD = amount0
    .multiply(new BigDecimal(jetton0.derivedTon).multiply(new BigDecimal(router.tonPriceUSD)))
    .add(
      amount1.multiply(
        new BigDecimal(jetton1.derivedTon).multiply(new BigDecimal(router.tonPriceUSD)),
      ),
    );
  let oldPoolTVLTon = pool.totalValueLockedTon;
  jetton0.totalValueLocked = new BigDecimal(jetton0.totalValueLocked).add(amount0).toString();
  jetton1.totalValueLocked = new BigDecimal(jetton1.totalValueLocked).add(amount1).toString();
  pool.totalValueLockedJetton0 = new BigDecimal(pool.totalValueLockedJetton0)
    .add(amount0)
    .toString();
  pool.totalValueLockedJetton1 = new BigDecimal(pool.totalValueLockedJetton1)
    .add(amount1)
    .toString();
  const updatedResults = await updateDerivedTVLAmounts(
    router,
    pool,
    jetton0,
    jetton1,
    new BigDecimal(oldPoolTVLTon),
  );
  jetton0 = updatedResults.jetton0;
  jetton1 = updatedResults.jetton1;
  router = updatedResults.router;
  pool = { ...pool, ...updatedResults.pool };

  router.txCount += ONE_BI;
  jetton0.txCount += ONE_BI;
  jetton1.txCount += ONE_BI;
  pool.txCount += ONE_BI;

  // Pools liquidity tracks the currently active liquidity given pools current tick.
  // We only want to update it on mint if the new position includes the current tick.
  if (pool.tick > event.tickLower && pool.tick < event.tickUpper) {
    pool.liquidity += event.amount;
  }
  pool.liquidityProviderCount += ONE_BI;
  let transaction = await loadTransaction(event);
  let mintData = {
    amount: event.amount,
    amount0: event.amount0.toString(),
    amount1: event.amount1.toString(),
    amountUSD: amountUSD.toString(),
    jetton0Id: jetton0.id,
    jetton1Id: jetton1.id,
    poolId: pool.id,
    sender: event.sender.toString(),
    tickLower: event.tickLower,
    tickUpper: event.tickUpper,
    transactionId: transaction.id,
    timestamp: new Date(event.block.timestamp),
  };

  let lowerTickIdx = event.tickLower;
  let upperTickIdx = event.tickUpper;
  let lowerTickId = `${pool.address}#${BigInt(event.tickLower).toString()}`;
  let upperTickId = `${pool.address}#${BigInt(event.tickUpper).toString()}`;
  let lowerTick = await db.query.tick.findFirst({
    where: eq(schema.tick.id, lowerTickId),
  });
  let upperTick = await db.query.tick.findFirst({
    where: eq(schema.tick.id, upperTickId),
  });

  if (!lowerTick) {
    lowerTick = createTick(lowerTickId, lowerTickIdx, pool, event);
  }

  if (!upperTick) {
    upperTick = createTick(upperTickId, upperTickIdx, pool, event);
  }

  let amount = event.amount;
  lowerTick.liquidityGross = lowerTick.liquidityGross + amount;
  lowerTick.liquidityNet = lowerTick.liquidityNet + amount;
  upperTick.liquidityGross = upperTick.liquidityGross + amount;
  upperTick.liquidityNet = upperTick.liquidityNet + amount;

  await updateRouterDayData(router, event);
  await updatePoolDayData(pool, event);
  await updateJettonDayData(router, jetton0, event);
  await updateJettonDayData(router, jetton1, event);

  await db.update(schema.jetton).set(jetton0).where(eq(schema.jetton.id, jetton0.id));
  await db.update(schema.jetton).set(jetton1).where(eq(schema.jetton.id, jetton1.id));
  await db.update(schema.pool).set(pool).where(eq(schema.pool.id, pool.id));
  await db.update(schema.router).set(router).where(eq(schema.router.id, router.id));
  await db.insert(schema.mint).values(mintData);

  await updateTickFeeVarsAndSave(lowerTick, event);
  await updateTickFeeVarsAndSave(upperTick, event);
};
