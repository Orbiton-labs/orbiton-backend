import { BurnEvent } from '@src/@types/core.type';
import { db } from '@src/db';
import { Router, BurnWithoutId } from '@src/models';
import { eq } from 'drizzle-orm';
import * as schema from '@src/models';
import { convertJettonToDecimal, getOrLoadJetton, updateJettonDayData } from '../utils/jetton';
import { Address } from '@ton/core';
import BigDecimal from 'decimal.js';
import { ONE_BI } from '@src/constants';
import { updateDerivedTVLAmounts } from '../utils/tvl';
import { loadTransaction } from '../utils';
import { updateRouterDayData } from '../utils/router';
import { updatePoolDayData } from '../utils/pool';
import { updateTickFeeVarsAndSave } from '../utils/ton';
import { objectWithoutId } from '../common';
import { BigDecimalConfig } from '../constant';
import { Functions } from '@orbiton_labs/v3-contracts-sdk';
import { getPosition, savePositionSnapshot, updateFeeVars } from '../utils/position';

BigDecimal.set(BigDecimalConfig);
export const handleBurn = async (event: BurnEvent) => {
  let router = (await db.query.router.findFirst({})) as Router | undefined;
  if (!router) {
    return;
  }

  const poolAddress = event.transaction.from;
  let pool = await db.query.pool.findFirst({
    where: eq(schema.pool.id, poolAddress.toString()),
  });
  if (!pool) {
    return;
  }

  const positionAddress = event.address;
  const calculatedPositionAddress = Functions.computePositionAddress(
    poolAddress,
    event.owner,
    event.tickLower,
    event.tickUpper,
  );
  if (calculatedPositionAddress.toString() !== positionAddress.toString()) {
    console.log('Position address not matched!');
    return;
  }
  let jetton0 = await getOrLoadJetton(Address.parse(pool.jetton0Id));
  let jetton1 = await getOrLoadJetton(Address.parse(pool.jetton1Id));
  let amount0 = convertJettonToDecimal(event.amount0, jetton0);
  let amount1 = convertJettonToDecimal(event.amount1, jetton1);

  let amountUSD = amount0
    .mul(new BigDecimal(jetton0.derivedTon).mul(new BigDecimal(router.tonPriceUSD)))
    .add(amount1.mul(new BigDecimal(jetton1.derivedTon).mul(new BigDecimal(router.tonPriceUSD))));

  // tx update
  router.txCount = (BigInt(router.txCount) + ONE_BI).toString();
  jetton0.txCount = (BigInt(jetton0.txCount) + ONE_BI).toString();
  jetton1.txCount = (BigInt(jetton1.txCount) + ONE_BI).toString();
  pool.txCount = (BigInt(pool.txCount) + ONE_BI).toString();

  // update TVL values.
  let oldPoolTotalValueLockedTon = pool.totalValueLockedTon;
  jetton0.totalValueLocked = new BigDecimal(jetton0.totalValueLocked)
    .sub(amount0)

    .toString();
  jetton1.totalValueLocked = new BigDecimal(jetton1.totalValueLocked)
    .sub(amount1)

    .toString();
  pool.totalValueLockedJetton0 = new BigDecimal(pool.totalValueLockedJetton0)
    .sub(amount0)

    .toString();
  pool.totalValueLockedJetton1 = new BigDecimal(pool.totalValueLockedJetton1)
    .sub(amount1)

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
    try {
      let [transaction, existed] = await loadTransaction(event, _db as any);
      if (existed) {
        console.log(`<handleBurn> Transaction ${transaction.id} already existed`);
        return;
      }

      let burnData = {
        amount: event.amount.toString(),
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

      await updateRouterDayData(router, event, _db as any);
      await updatePoolDayData(pool, event, _db as any);
      await updateJettonDayData(router, jetton0, event, _db as any);
      await updateJettonDayData(router, jetton1, event, _db as any);

      await _db.update(schema.pool).set(objectWithoutId(pool)).where(eq(schema.pool.id, pool.id));
      let position = await getPosition(positionAddress, event, _db as any);
      if (position) {
        position.liquidity = (BigInt(position.liquidity) + event.amount).toString();
        position.depositedJetton0 = new BigDecimal(position.depositedJetton0)
          .minus(amount0)
          .toString();
        position.depositedJetton1 = new BigDecimal(position.depositedJetton1)
          .minus(amount1)
          .toString();
        position = await updateFeeVars(position, _db as any);
        await _db
          .update(schema.position)
          .set(objectWithoutId(position))
          .where(eq(schema.position.id, position.id));
        await savePositionSnapshot(position, event, _db as any);
      }

      await _db
        .update(schema.jetton)
        .set(objectWithoutId(jetton0))
        .where(eq(schema.jetton.id, jetton0.id));
      await _db
        .update(schema.jetton)
        .set(objectWithoutId(jetton1))
        .where(eq(schema.jetton.id, jetton1.id));

      await _db
        .update(schema.router)
        .set(objectWithoutId(router))
        .where(eq(schema.router.id, router.id));
      await _db.insert(schema.burn).values(burnData);
      await updateTickFeeVarsAndSave(lowerTick, event, _db as any);
      await updateTickFeeVarsAndSave(upperTick, event, _db as any);
    } catch (err) {
      _db.rollback();
    }
  });
};
