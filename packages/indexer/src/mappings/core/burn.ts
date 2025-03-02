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
import { updateTickFeeVarsAndSave } from '../utils/ton';

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
  router.txCount = (BigInt(router.txCount) + ONE_BI).toString();
  jetton0.txCount = (BigInt(jetton0.txCount) + ONE_BI).toString();
  jetton1.txCount = (BigInt(jetton1.txCount) + ONE_BI).toString();
  pool.txCount = (BigInt(pool.txCount) + ONE_BI).toString();

  // update TVL values.
  let oldPoolTotalValueLockedTon = pool.totalValueLockedTon;
  jetton0.totalValueLocked = new BigDecimal(jetton0.totalValueLocked).subtract(amount0).getValue();
  jetton1.totalValueLocked = new BigDecimal(jetton1.totalValueLocked).subtract(amount1).getValue();
  pool.totalValueLockedJetton0 = new BigDecimal(pool.totalValueLockedJetton0)
    .subtract(amount0)
    .getValue();
  pool.totalValueLockedJetton1 = new BigDecimal(pool.totalValueLockedJetton1)
    .subtract(amount1)
    .getValue();
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
    pool.liquidity = (BigInt(pool.liquidity) - event.amount).toString();
  }

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
  lowerTick.liquidityGross = (BigInt(lowerTick.liquidityGross) - amount).toString();
  lowerTick.liquidityNet = (BigInt(lowerTick.liquidityNet) - amount).toString();
  upperTick.liquidityGross = (BigInt(upperTick.liquidityGross) - amount).toString();
  upperTick.liquidityNet = (BigInt(upperTick.liquidityNet) + amount).toString();

  await db.transaction(async (_db) => {
    let transaction = await loadTransaction(event, _db as any);
    let burnData = {
      amount: event.amount.toString(),
      amount0: event.amount0.toString(),
      amount1: event.amount1.toString(),
      amountUSD: amountUSD.getValue(),
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

    await updateRouterDayData(router, event, _db as any);
    await updatePoolDayData(pool, event, _db as any);
    await updateJettonDayData(router, jetton0, event, _db as any);
    await updateJettonDayData(router, jetton1, event, _db as any);

    const { id: jetton0Id, ...jetton0Data } = jetton0;
    await _db.update(schema.jetton).set(jetton0Data).where(eq(schema.jetton.id, jetton0.id));
    const { id: jetton1Id, ...jetton1Data } = jetton1;
    await _db.update(schema.jetton).set(jetton1Data).where(eq(schema.jetton.id, jetton1.id));
    const { id: poolId, ...poolData } = pool;
    await _db.update(schema.pool).set(poolData).where(eq(schema.pool.id, pool.id));
    const { id: routerId, ...routerData } = router;
    await _db.update(schema.router).set(routerData).where(eq(schema.router.id, router.id));
    await _db.insert(schema.burn).values(burnData);
    await updateTickFeeVarsAndSave(lowerTick, event, _db as any);
    await updateTickFeeVarsAndSave(upperTick, event, _db as any);
  });
};
