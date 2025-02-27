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
  });
  if (!pool) {
    return;
  }
  let jetton0 = await getOrLoadJetton(Address.parse(pool.jetton0Id));
  let jetton1 = await getOrLoadJetton(Address.parse(pool.jetton1Id));
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
  jetton0.totalValueLocked = new BigDecimal(jetton0.totalValueLocked).add(amount0).getValue();
  jetton1.totalValueLocked = new BigDecimal(jetton1.totalValueLocked).add(amount1).getValue();
  pool.totalValueLockedJetton0 = new BigDecimal(pool.totalValueLockedJetton0)
    .add(amount0)
    .getValue();
  pool.totalValueLockedJetton1 = new BigDecimal(pool.totalValueLockedJetton1)
    .add(amount1)
    .getValue();
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

  router.txCount = (BigInt(router.txCount) + ONE_BI).toString();
  jetton0.txCount = (BigInt(jetton0.txCount) + ONE_BI).toString();
  jetton1.txCount = (BigInt(jetton1.txCount) + ONE_BI).toString();
  pool.txCount = (BigInt(pool.txCount) + ONE_BI).toString();

  // Pools liquidity tracks the currently active liquidity given pools current tick.
  // We only want to update it on mint if the new position includes the current tick.
  if (pool.tick > event.tickLower && pool.tick < event.tickUpper) {
    pool.liquidity = (BigInt(pool.liquidity) + event.amount).toString();
  }
  pool.liquidityProviderCount = (BigInt(pool.liquidityProviderCount) + ONE_BI).toString();
  let transaction = await loadTransaction(event);
  let mintData = {
    amount: event.amount.toString(),
    amount0: event.amount0.toString(),
    amount1: event.amount1.toString(),
    amountUSD: amountUSD.toString(),
    jetton0Id: jetton0.id,
    jetton1Id: jetton1.id,
    poolId: pool.id,
    sender: event.sender.toString(),
    owner: event.owner.toString(),
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
  lowerTick.liquidityGross = (BigInt(lowerTick.liquidityGross) + amount).toString();
  lowerTick.liquidityNet = (BigInt(lowerTick.liquidityNet) + amount).toString();
  upperTick.liquidityGross = (BigInt(upperTick.liquidityGross) + amount).toString();
  upperTick.liquidityNet = (BigInt(upperTick.liquidityNet) - amount).toString();

  await updateRouterDayData(router, event);
  await updatePoolDayData(pool, event);
  await updateJettonDayData(router, jetton0, event);
  await updateJettonDayData(router, jetton1, event);

  await db.transaction(async (_db) => {
    const { id: jettonId, ...jetton0Data } = jetton0;
    await _db.update(schema.jetton).set(jetton0Data).where(eq(schema.jetton.id, jetton0.id));
    const { id: jettonId1, ...jetton1Data } = jetton1;
    await _db.update(schema.jetton).set(jetton1Data).where(eq(schema.jetton.id, jetton1.id));
    const { id: poolId, ...poolData } = pool;
    await _db.update(schema.pool).set(poolData).where(eq(schema.pool.id, pool.id));
    const { id: routerId, ...routerData } = router;
    await _db.update(schema.router).set(routerData).where(eq(schema.router.id, router.id));
    await _db.insert(schema.mint).values(mintData);
    await updateTickFeeVarsAndSave(lowerTick, event, _db as any);
    await updateTickFeeVarsAndSave(upperTick, event, _db as any);
  });
};
