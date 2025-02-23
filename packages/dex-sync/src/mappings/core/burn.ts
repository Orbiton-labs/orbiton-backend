import { BurnEvent } from '@src/@types/core.type';
import { db } from '@src/db';
import { Router, BurnWithoutId } from '@src/models';
import { eq } from 'drizzle-orm';
import * as schema from '@src/models';
import { convertJettonToDecimal, getOrLoadJetton, updateJettonDayData } from '../utils/jetton';
import { Address } from '@ton/core';
import BigDecimal from 'js-big-decimal';
import { ONE_BI } from '@src/constants';
import { updateDerivedTVLAmounts } from '../utils/tvl';
import { loadTransaction } from '../utils';
import { updateRouterDayData } from '../utils/router';
import { updatePoolDayData } from '../utils/pool';

export const handleBurn = async (event: BurnEvent) => {
  let router = (await db.query.router.findFirst({})) as Router | undefined;
  if (!router) {
    return;
  }

  let poolAddress = event.address;
  let pool = await db.query.pool.findFirst({
    where: eq(schema.pool.address, poolAddress.toString()),
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

  // tx update
  router.txCount = router.txCount + ONE_BI;
  jetton0.txCount = jetton0.txCount + ONE_BI;
  jetton1.txCount = jetton1.txCount + ONE_BI;
  pool.txCount = pool.txCount + ONE_BI;

  // update TVL values.
  let oldPoolTotalValueLockedTon = pool.totalValueLockedTon;
  jetton0.totalValueLocked = new BigDecimal(jetton0.totalValueLocked).subtract(amount0).toString();
  jetton1.totalValueLocked = new BigDecimal(jetton1.totalValueLocked).subtract(amount1).toString();
  pool.totalValueLockedJetton0 = new BigDecimal(pool.totalValueLockedJetton0)
    .subtract(amount0)
    .toString();
  pool.totalValueLockedJetton1 = new BigDecimal(pool.totalValueLockedJetton1)
    .subtract(amount1)
    .toString();
  const data = await updateDerivedTVLAmounts(
    router,
    pool,
    jetton0,
    jetton1,
    new BigDecimal(oldPoolTotalValueLockedTon),
  );
  router = data.router;
  pool = data.pool;
  jetton0 = data.jetton0;
  jetton1 = data.jetton1;

  // pools liquidity tracks the currently active liquidity given pools current tick.
  // we only want to update it on burn if the position being burnt includes the current tick.
  if (event.tickLower < pool.tick && event.tickUpper > pool.tick) {
    pool.liquidity = pool.liquidity - event.amount;
  }

  let transaction = await loadTransaction(event);
  let burnData = {
    amount: event.amount,
    amount0: event.amount0.toString(),
    amount1: event.amount1.toString(),
    amountUSD: amountUSD.toString(),
    jetton0Id: jetton0.id,
    jetton1Id: jetton1.id,
    poolId: pool.id,
    transactionId: transaction.id,
    timestamp: new Date(event.block.timestamp),
    owner: event.owner.toString(),
    origin: event.transaction.from.toString(),
    tickLower: event.tickLower,
    tickUpper: event.tickUpper,
  } as BurnWithoutId;

  let lowerTickId = `${poolAddress}#${event.tickLower.toString()}`;
  let lowerUpperId = `${poolAddress}#${event.tickUpper.toString()}`;
  let lowerTick = await db.query.tick.findFirst({
    where: eq(schema.tick.id, lowerTickId),
  });
  let upperTick = await db.query.tick.findFirst({
    where: eq(schema.tick.id, lowerUpperId),
  });
  if (!lowerTick || !upperTick) {
    return;
  }

  let amount = event.amount;
  lowerTick.liquidityGross = lowerTick.liquidityGross - amount;
  lowerTick.liquidityNet = lowerTick.liquidityNet - amount;
  upperTick.liquidityGross = upperTick.liquidityGross - amount;
  upperTick.liquidityNet = upperTick.liquidityNet - amount;

  await updateRouterDayData(router, event);
  await updatePoolDayData(pool, event);
  await updateJettonDayData(router, jetton0, event);
  await updateJettonDayData(router, jetton1, event);

  await db.update(schema.jetton).set(jetton0).where(eq(schema.jetton.id, jetton0.id));
  await db.update(schema.jetton).set(jetton1).where(eq(schema.jetton.id, jetton1.id));
  await db.update(schema.pool).set(pool).where(eq(schema.pool.id, pool.id));
  await db.update(schema.router).set(router).where(eq(schema.router.id, router.id));
  await db.insert(schema.burn).values(burnData);
};
