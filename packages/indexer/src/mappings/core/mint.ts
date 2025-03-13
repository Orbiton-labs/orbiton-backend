import { MintEvent } from '@src/@types/core.type';
import { db } from '@src/db';
import { eq } from 'drizzle-orm';
import * as schema from '@src/models/index';
import { convertJettonToDecimal, getOrLoadJetton, updateJettonDayData } from '../utils/jetton';
import { Address } from '@ton/core';
import { Router } from '@src/models/router';
import BigDecimal from 'decimal.js';
import { updateDerivedTVLAmounts } from '../utils/tvl';
import { ONE_BI } from '@src/constants';
import { loadTransaction } from '../utils';
import { createTick } from '../utils/tick';
import { updateRouterDayData } from '../utils/router';
import { getJettonsMasterOnchain, updatePoolDayData } from '../utils/pool';
import { updateTickFeeVarsAndSave } from '../utils/ton';
import { objectWithoutId } from '../common';
import { BigDecimalConfig } from '../constant';
import { Functions } from '@orbiton_labs/v3-contracts-sdk';
import { getPosition, savePositionSnapshot, updateFeeVars } from '../utils/position';

BigDecimal.set(BigDecimalConfig);

export const handleMint = async (event: MintEvent) => {
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
  const [jetton0MasterAddress, jetton1MasterAddress] = await getJettonsMasterOnchain(
    Address.parse(pool.id),
  );
  let jetton0 = await getOrLoadJetton(jetton0MasterAddress);
  let jetton1 = await getOrLoadJetton(jetton1MasterAddress);
  let amount0 = convertJettonToDecimal(event.amount0, jetton0);
  let amount1 = convertJettonToDecimal(event.amount1, jetton1);
  let amountUSD = amount0
    .mul(new BigDecimal(jetton0.derivedTon).mul(new BigDecimal(router.tonPriceUSD)))
    .add(amount1.mul(new BigDecimal(jetton1.derivedTon).mul(new BigDecimal(router.tonPriceUSD))));

  let oldPoolTVLTon = pool.totalValueLockedTon;
  jetton0.totalValueLocked = new BigDecimal(jetton0.totalValueLocked).add(amount0).toString();
  jetton1.totalValueLocked = new BigDecimal(jetton1.totalValueLocked).add(amount1).toString();
  pool.jetton0Id = jetton0.id;
  pool.jetton1Id = jetton1.id;
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

  let lowerTickIdx = event.tickLower;
  let upperTickIdx = event.tickUpper;
  let lowerTickId = `${pool.id}#${BigInt(event.tickLower).toString()}`;
  let upperTickId = `${pool.id}#${BigInt(event.tickUpper).toString()}`;
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

  await db.transaction(async (_db) => {
    try {
      const [transaction, existed] = await loadTransaction(event, _db as any);
      if (existed) {
        console.log(`<handleMint> Transaction ${transaction.id} already handled`);
        return;
      }
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

      await updateRouterDayData(router, event, _db as any);
      await updatePoolDayData(pool, event, _db as any);
      await updateJettonDayData(router, jetton0, event, _db as any);
      await updateJettonDayData(router, jetton1, event, _db as any);

      await _db.update(schema.pool).set(objectWithoutId(pool)).where(eq(schema.pool.id, pool.id));
      let position = await getPosition(positionAddress, event, _db as any);
      if (position) {
        position.liquidity = (BigInt(position.liquidity) + event.amount).toString();
        position.depositedJetton0 = new BigDecimal(position.depositedJetton0)
          .add(amount0)
          .toString();
        position.depositedJetton1 = new BigDecimal(position.depositedJetton1)
          .add(amount1)
          .toString();
        position = await updateFeeVars(position, _db as any);
        await _db
          .insert(schema.position)
          .values(position)
          .onConflictDoUpdate({
            target: schema.position.id,
            set: {
              ...objectWithoutId(position),
            },
          });
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
      await _db.insert(schema.mint).values(mintData);
      await updateTickFeeVarsAndSave(lowerTick, event, _db as any);
      await updateTickFeeVarsAndSave(upperTick, event, _db as any);
    } catch (err) {
      console.log(err);
      _db.rollback();
    }
  });
};
