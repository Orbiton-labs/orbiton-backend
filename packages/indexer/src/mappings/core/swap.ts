import { SwapEvent } from '@src/@types/core.type';
import { db } from '@src/db';
import { Router, Swap } from '@src/models';
import { eq } from 'drizzle-orm';
import * as schema from '@src/models';
import { convertJettonToDecimal, getOrLoadJetton, updateJettonDayData } from '../utils/jetton';
import BigDecimal from 'decimal.js';
import { getAdjustedAmounts, sqrtPriceX96ToJettonPrices } from '../utils/pricing';
import { ONE_BI, TWO_BD } from '@src/constants';
import { getTonPrice, loadTickUpdateFeeVarsAndSave } from '../utils/ton';
import { loadTransaction } from '../utils';
import { updateDerivedTVLAmounts } from '../utils/tvl';
import { updateRouterDayData } from '../utils/router';
import { updatePoolDayData } from '../utils/pool';
import { Address } from '@ton/core';
import { tonClient } from '@src/services/ton-client';
import { PoolWrapper } from '@orbiton_labs/v3-contracts-sdk';
import { objectWithoutId } from '../common';
import { BigDecimalConfig } from '../constant';
import { feeTierToTickSpacing } from '../utils/tick';
import Queue from 'queue';

BigDecimal.set(BigDecimalConfig);

const tickQueue = new Queue({ autostart: true, concurrency: 1 });
export const handleSwap = async (event: SwapEvent) => {
  let router = (await db.query.router.findFirst({})) as Router | undefined;
  if (!router) {
    return;
  }
  let pool = await db.query.pool.findFirst({
    where: eq(schema.pool.id, event.address.toString()),
  });
  if (!pool) {
    return;
  }
  let jetton0 = await getOrLoadJetton(Address.parse(pool.jetton0Id));
  let jetton1 = await getOrLoadJetton(Address.parse(pool.jetton1Id));
  let oldTick = pool.tick!;
  let amount0 = convertJettonToDecimal(event.amount0, jetton0);
  let amount1 = convertJettonToDecimal(event.amount1, jetton1);
  let protocolFeesAmount0 = convertJettonToDecimal(event.protocolFeesJetton0, jetton0);
  let protocolFeesAmount1 = convertJettonToDecimal(event.protocolFeesJetton1, jetton1);

  let amount0Abs = amount0.lessThan(0) ? amount0.negated() : amount0;
  let amount1Abs = amount1.lessThan(0) ? amount1.negated() : amount1;
  let volumeAmounts = getAdjustedAmounts(router, amount0Abs, jetton0, amount1Abs, jetton1);
  let volumeTon = volumeAmounts.ton.div(new BigDecimal(TWO_BD));
  let volumeUSD = volumeAmounts.usd.div(new BigDecimal(TWO_BD));

  let protocolFeeAmounts = getAdjustedAmounts(
    router,
    protocolFeesAmount0,
    jetton0,
    protocolFeesAmount1,
    jetton1,
  );
  let feesTon = volumeTon
    .mul(new BigDecimal(pool.feeTier.toString()))
    .div(new BigDecimal('1000000'));
  let feesUSD = volumeUSD
    .mul(new BigDecimal(pool.feeTier.toString()))
    .div(new BigDecimal('1000000'));
  let feesProtocolTon = protocolFeeAmounts.ton;

  // router update
  router.txCount = (BigInt(router.txCount) + ONE_BI).toString();
  router.totalVolumeTon = new BigDecimal(router.totalVolumeTon)
    .add(volumeTon)

    .toString();
  router.totalVolumeUSD = new BigDecimal(router.totalVolumeUSD)
    .add(volumeUSD)

    .toString();
  router.totalFeesTon = new BigDecimal(router.totalFeesTon)
    .add(feesTon)

    .toString();
  router.totalFeesUSD = new BigDecimal(router.totalFeesUSD)
    .add(feesUSD)

    .toString();
  router.totalProtocolFeesTon = new BigDecimal(router.totalProtocolFeesTon)
    .add(feesProtocolTon)

    .toString();
  router.totalProtocolFeesUSD = new BigDecimal(router.totalProtocolFeesUSD)
    .add(protocolFeeAmounts.usd)

    .toString();

  // pool data update
  pool.volumeJetton0 = new BigDecimal(pool.volumeJetton0)
    .add(amount0Abs)

    .toString();
  pool.volumeJetton1 = new BigDecimal(pool.volumeJetton1)
    .add(amount1Abs)

    .toString();
  pool.volumeUSD = new BigDecimal(pool.volumeUSD).add(volumeUSD).toString();
  pool.feesUSD = new BigDecimal(pool.feesUSD).add(feesUSD).toString();
  pool.protocolFeesUSD = new BigDecimal(pool.protocolFeesUSD)
    .add(protocolFeeAmounts.usd)

    .toString();
  pool.txCount = (BigInt(pool.txCount) + ONE_BI).toString();

  // update the pool with the new active liquidity, price, and tick.
  pool.liquidity = event.liquidity.toString();
  pool.tick = event.tick;
  pool.sqrtPrice = event.sqrtPriceX96.toString();

  // update jetton0 data
  jetton0.volume = new BigDecimal(jetton0.volume).add(amount0Abs).toString();
  jetton0.volumeUSD = new BigDecimal(jetton0.volumeUSD)
    .add(volumeUSD)

    .toString();
  jetton0.feesUSD = new BigDecimal(jetton0.feesUSD).add(feesUSD).toString();
  jetton0.protocolFeesUSD = new BigDecimal(jetton0.protocolFeesUSD)
    .add(protocolFeeAmounts.usd)

    .toString();
  jetton0.txCount = (BigInt(jetton0.txCount) + ONE_BI).toString();

  // update jetton1 data
  jetton1.volume = new BigDecimal(jetton1.volume).add(amount1Abs).toString();
  jetton1.volumeUSD = new BigDecimal(jetton1.volumeUSD)
    .add(volumeUSD)

    .toString();
  jetton1.feesUSD = new BigDecimal(jetton1.feesUSD).add(feesUSD).toString();
  jetton1.protocolFeesUSD = new BigDecimal(jetton1.protocolFeesUSD)
    .add(protocolFeeAmounts.usd)

    .toString();
  jetton1.txCount = (BigInt(jetton1.txCount) + ONE_BI).toString();

  // updated pool rates
  let prices = sqrtPriceX96ToJettonPrices(BigInt(pool.sqrtPrice), jetton0, jetton1);
  pool.jetton0Price = prices[0].toString();
  pool.jetton1Price = prices[1].toString();
  await db.update(schema.pool).set(objectWithoutId(pool)).where(eq(schema.pool.id, pool.id));

  // update USD pricing
  // let jetton0DerivedTon = jetton0.derivedTon;
  router.tonPriceUSD = (await getTonPrice()).toString();
  await db
    .update(schema.router)
    .set(objectWithoutId(router))
    .where(eq(schema.router.id, router.id));

  jetton0.derivedUSD = new BigDecimal(jetton0.derivedTon)
    .mul(new BigDecimal(router.tonPriceUSD))

    .toString();
  jetton1.derivedUSD = new BigDecimal(jetton1.derivedTon)
    .mul(new BigDecimal(router.tonPriceUSD))

    .toString();

  await db.transaction(async (_db) => {
    try {
      let [transaction, existed] = await loadTransaction(event, _db as any);
      if (existed) {
        console.log(`<handleSwap> Transaction ${transaction.id} already existed`);
        return;
      }

      // update TVL values
      let oldPoolTVLTon = pool.totalValueLockedTon;
      pool.totalValueLockedJetton0 = new BigDecimal(pool.totalValueLockedJetton0)
        .add(amount0)
        .toString();
      pool.totalValueLockedJetton1 = new BigDecimal(pool.totalValueLockedJetton1)
        .add(amount1)
        .toString();
      jetton0.totalValueLocked = new BigDecimal(jetton0.totalValueLocked).add(amount0).toString();
      jetton1.totalValueLocked = new BigDecimal(jetton1.totalValueLocked).add(amount1).toString();
      const updatedResults = await updateDerivedTVLAmounts(
        router,
        pool,
        jetton0,
        jetton1,
        new BigDecimal(oldPoolTVLTon),
        _db as any,
      );

      jetton0 = updatedResults.jetton0;
      jetton1 = updatedResults.jetton1;
      router = updatedResults.router;
      pool = { ...pool, ...updatedResults.pool };

      // create Swap event
      let swap = {
        amount0: amount0.toString(),
        amount1: amount1.toString(),
        amountUSD: volumeUSD.toString(),
        amountFeeUSD: protocolFeeAmounts.usd.toString(),
        poolId: pool.id,
        jetton0Id: jetton0.id,
        jetton1Id: jetton1.id,
        recipient: event.recipient.toString(),
        sender: event.sender.toString(),
        origin: event.transaction.from.toString(),
        sqrtPriceX96: event.sqrtPriceX96.toString(),
        tick: event.tick,
        timestamp: new Date(event.block.timestamp),
        transactionId: transaction.id,
      };

      // TODO: update fee frowth
      let poolContract = tonClient.open(PoolWrapper.Pool.createFromAddress(Address.parse(pool.id)));
      const [feeGrowthGlobal0X128, feeGrowthGlobal1X128, ..._dump] =
        await poolContract.getFeesGrowthGlobal();
      pool.feeGrowthGlobal0X128 = (feeGrowthGlobal0X128 as BigInt).toString();
      pool.feeGrowthGlobal1X128 = (feeGrowthGlobal1X128 as BigInt).toString();

      // interval data
      let routerDayData = await updateRouterDayData(router, event, _db as any);
      let poolDayData = await updatePoolDayData(pool, event, _db as any);
      let jetton0DayData = await updateJettonDayData(router, jetton0, event, _db as any);
      let jetton1DayData = await updateJettonDayData(router, jetton1, event, _db as any);

      // update volume metrics
      routerDayData.volumeTon = new BigDecimal(routerDayData.volumeTon)
        .add(volumeTon)

        .toString();
      routerDayData.volumeUSD = new BigDecimal(routerDayData.volumeUSD)
        .add(volumeUSD)

        .toString();
      routerDayData.feesUSD = new BigDecimal(routerDayData.feesUSD)
        .add(feesUSD)

        .toString();
      routerDayData.protocolFeesUSD = new BigDecimal(routerDayData.protocolFeesUSD)
        .add(protocolFeeAmounts.usd)

        .toString();

      poolDayData.volumeUSD = new BigDecimal(poolDayData.volumeUSD)
        .add(volumeUSD)

        .toString();
      poolDayData.volumeJetton0 = new BigDecimal(poolDayData.volumeJetton0)
        .add(amount0Abs)

        .toString();
      poolDayData.volumeJetton1 = new BigDecimal(poolDayData.volumeJetton1)
        .add(amount1Abs)

        .toString();
      poolDayData.feesUSD = new BigDecimal(poolDayData.feesUSD)
        .add(feesUSD)

        .toString();
      poolDayData.protocolFeesUSD = new BigDecimal(poolDayData.protocolFeesUSD)
        .add(protocolFeeAmounts.usd)

        .toString();

      jetton0DayData.volume = new BigDecimal(jetton0DayData.volume)
        .add(amount0Abs)

        .toString();
      jetton0DayData.volumeUSD = new BigDecimal(jetton0DayData.volumeUSD)
        .add(volumeUSD)

        .toString();
      jetton0DayData.feesUSD = new BigDecimal(jetton0DayData.feesUSD)
        .add(feesUSD)

        .toString();
      jetton0DayData.protocolFeesUSD = new BigDecimal(jetton0DayData.protocolFeesUSD)
        .add(protocolFeeAmounts.usd)

        .toString();

      jetton1DayData.volume = new BigDecimal(jetton1DayData.volume)
        .add(amount1Abs)

        .toString();
      jetton1DayData.volumeUSD = new BigDecimal(jetton1DayData.volumeUSD)
        .add(volumeUSD)

        .toString();
      jetton1DayData.feesUSD = new BigDecimal(jetton1DayData.feesUSD)
        .add(feesUSD)

        .toString();
      jetton1DayData.protocolFeesUSD = new BigDecimal(jetton1DayData.protocolFeesUSD)
        .add(protocolFeeAmounts.usd)

        .toString();

      await _db.insert(schema.swap).values({ ...swap });
      await _db
        .update(schema.router)
        .set(objectWithoutId(router))
        .where(eq(schema.router.id, router.id));
      await _db.update(schema.pool).set(objectWithoutId(pool)).where(eq(schema.pool.id, pool.id));
      await _db
        .update(schema.jetton)
        .set(objectWithoutId(jetton0))
        .where(eq(schema.jetton.id, jetton0.id));
      await _db
        .update(schema.jetton)
        .set(objectWithoutId(jetton1))
        .where(eq(schema.jetton.id, jetton1.id));
      await _db
        .update(schema.routerData)
        .set(objectWithoutId(routerDayData))
        .where(eq(schema.routerData.id, routerDayData.id));
      await _db
        .update(schema.poolData)
        .set(objectWithoutId(poolDayData))
        .where(eq(schema.poolData.id, poolDayData.id));
      await _db
        .update(schema.jettonData)
        .set(objectWithoutId(jetton0DayData))
        .where(eq(schema.jettonData.id, jetton0DayData.id));
      await _db
        .update(schema.jettonData)
        .set(objectWithoutId(jetton1DayData))
        .where(eq(schema.jettonData.id, jetton1DayData.id));
    } catch (err) {
      _db.rollback();
    }
  });

  // TODO: write a job here which will update all ticks from previous current tick to current tick
  let newTick = pool.tick!;
  let tickSpacing = feeTierToTickSpacing(pool.feeTier);
  let modulo = newTick % tickSpacing;

  if (modulo === 0n) {
    tickQueue.push(async () => {
      await loadTickUpdateFeeVarsAndSave(newTick, Address.parse(pool.id));
    });
  }

  let numIters = oldTick - newTick / tickSpacing;
  numIters = numIters < 0 ? -numIters : numIters;

  let start: bigint, end: bigint;
  [start, end] = oldTick < newTick ? [oldTick, newTick] : [newTick, oldTick];

  for (let i = start; i <= end; i += tickSpacing) {
    tickQueue.push(async () => {
      await loadTickUpdateFeeVarsAndSave(i, Address.parse(pool.id));
    });
  }
};
