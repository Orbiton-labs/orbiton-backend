import { SwapEvent } from '@src/@types/core.type';
import { db } from '@src/db';
import { Router, Swap } from '@src/models';
import { eq } from 'drizzle-orm';
import * as schema from '@src/models';
import { convertJettonToDecimal, getOrLoadJetton, updateJettonDayData } from '../utils/jetton';
import BigDecimal from 'js-big-decimal';
import { getAdjustedAmounts, sqrtPriceX96ToJettonPrices } from '../utils/pricing';
import { ONE_BI, ZERO_BI } from '@src/constants';
import { getTonPrice, loadTickUpdateFeeVarsAndSave } from '../utils/ton';
import { loadTransaction } from '../utils';
import { updateDerivedTVLAmounts } from '../utils/tvl';
import { updateRouterDayData } from '../utils/router';
import { updatePoolDayData } from '../utils/pool';
import { feeTierToTickSpacing } from '../utils/tick';

export const handleSwap = async (event: SwapEvent) => {
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
  let { jetton0, jetton1 } = pool;
  let oldTick = pool.tick;
  let amount0 = convertJettonToDecimal(event.amount0, jetton0);
  let amount1 = convertJettonToDecimal(event.amount1, jetton1);

  let protocolFeesAmount0 = convertJettonToDecimal(event.protocolFeesJetton0, jetton0);
  let protocolFeesAmount1 = convertJettonToDecimal(event.protocolFeesJetton1, jetton1);

  let amount0Abs = amount0.compareTo(new BigDecimal('0')) === -1 ? amount0.negate() : amount0;
  let amount1Abs = amount1.compareTo(new BigDecimal('0')) === -1 ? amount1.negate() : amount1;

  let volumeAmounts = getAdjustedAmounts(router, amount0Abs, jetton0, amount1Abs, jetton1);
  let volumeTon = volumeAmounts.ton;
  let volumeUSD = volumeAmounts.usd;

  let protocolFeeAmounts = getAdjustedAmounts(
    router,
    protocolFeesAmount0,
    jetton0,
    protocolFeesAmount1,
    jetton1,
  );
  let feesTon = volumeTon
    .multiply(new BigDecimal(pool.feeTier.toString()))
    .divide(new BigDecimal('1000000'));
  let feesUSD = volumeUSD
    .multiply(new BigDecimal(pool.feeTier.toString()))
    .divide(new BigDecimal('1000000'));
  let feesProtocolTon = protocolFeeAmounts.ton;

  // router update
  router.txCount = router.txCount + ONE_BI;
  router.totalVolumeTon = router.totalVolumeTon + volumeTon;
  router.totalVolumeUSD = router.totalVolumeUSD + volumeUSD;
  router.totalFeesTon = router.totalFeesTon + feesTon;
  router.totalFeesUSD = router.totalFeesUSD + feesUSD;
  router.totalProtocolFeesTon = router.totalProtocolFeesTon + feesProtocolTon;
  router.totalProtocolFeesUSD = router.totalProtocolFeesUSD + protocolFeeAmounts.usd;

  // pool update
  pool.volumeJetton0 = pool.volumeJetton0 + amount0Abs;
  pool.volumeJetton1 = pool.volumeJetton1 + amount1Abs;
  pool.volumeUSD = pool.volumeUSD + volumeUSD;
  pool.feesUSD = pool.feesUSD + feesUSD;
  pool.protocolFeesUSD = pool.protocolFeesUSD + protocolFeeAmounts.usd;
  pool.txCount = pool.txCount + ONE_BI;

  // update the pool with the new active liquidity, price, and tick.
  pool.liquidity = event.liquidity;
  pool.tick = event.tick;
  pool.sqrtPrice = event.sqrtPriceX96;

  // update jetton0 data
  jetton0.volume = jetton0.volume + amount0Abs;
  jetton0.volumeUSD = jetton0.volumeUSD + volumeUSD;
  jetton0.feesUSD = jetton0.feesUSD + feesUSD;
  jetton0.protocolFeesUSD = jetton0.protocolFeesUSD + protocolFeeAmounts.usd;
  jetton0.txCount = jetton0.txCount + ONE_BI;

  // update jetton1 data
  jetton1.volume = jetton1.volume + amount1Abs;
  jetton1.volumeUSD = jetton1.volumeUSD + volumeUSD;
  jetton1.feesUSD = jetton1.feesUSD + feesUSD;
  jetton1.protocolFeesUSD = jetton1.protocolFeesUSD + protocolFeeAmounts.usd;
  jetton1.txCount = jetton1.txCount + ONE_BI;

  // updated pool rates
  let prices = sqrtPriceX96ToJettonPrices(pool.sqrtPrice, jetton0, jetton1);
  pool.jetton0Price = prices[0].toString();
  pool.jetton1Price = prices[1].toString();
  await db
    .update(schema.pool)
    .set({ ...pool })
    .where(eq(schema.pool.id, pool.id));

  // update USD pricing
  let jetton0DerivedTon = jetton0.derivedTon;
  router.tonPriceUSD = (await getTonPrice()).toString();
  await db
    .update(schema.router)
    .set({ ...router })
    .where(eq(schema.router.id, router.id));

  let transaction = await loadTransaction(event);
  jetton0.derivedUSD = new BigDecimal(jetton0.derivedTon)
    .multiply(new BigDecimal(router.tonPriceUSD))
    .toString();
  jetton1.derivedUSD = new BigDecimal(jetton1.derivedTon)
    .multiply(new BigDecimal(router.tonPriceUSD))
    .toString();

  // update TVL values
  let oldPoolTVLTon = pool.totalValueLockedTon;
  pool.totalValueLockedJetton0 = pool.totalValueLockedJetton0 + amount0;
  pool.totalValueLockedJetton1 = pool.totalValueLockedJetton1 + amount1;
  jetton0.totalValueLocked = jetton0.totalValueLocked + amount0;
  jetton1.totalValueLocked = jetton1.totalValueLocked + amount1;
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

  // create Swap event
  let swap = {
    amount0: amount0.toString(),
    amount1: amount1.toString(),
    amountUSD: volumeUSD.toString(),
    amountFeeUSD: protocolFeeAmounts.usd.toString(),
    poolId: pool.id,
    jetton0Id: pool.jetton0.id,
    jetton1Id: pool.jetton1.id,
    recipient: event.recipient.toString(),
    sender: event.sender.toString(),
    origin: event.transaction.from.toString(),
    sqrtPriceX96: event.sqrtPriceX96,
    tick: event.tick,
    timestamp: new Date(event.block.timestamp),
    transactionId: transaction.id,
  };

  // TODO: update fee frowth
  // let feeGrowthGlobal0X128 = poolContract.feeGrowthGlobal0X128();
  // let feeGrowthGlobal1X128 = poolContract.feeGrowthGlobal1X128();
  // pool.feeGrowthGlobal0X128 = feeGrowthGlobal0X128 as BigInt;
  // pool.feeGrowthGlobal1X128 = feeGrowthGlobal1X128 as BigInt;

  // interval data
  let routerDayData = await updateRouterDayData(router, event);
  let poolDayData = await updatePoolDayData(pool, event);
  let jetton0DayData = await updateJettonDayData(router, jetton0, event);
  let jetton1DayData = await updateJettonDayData(router, jetton1, event);

  // update volume metrics
  routerDayData.volumeTon = routerDayData.volumeTon + volumeTon;
  routerDayData.volumeUSD = routerDayData.volumeUSD + volumeUSD;
  routerDayData.feesUSD = routerDayData.feesUSD + feesUSD;
  routerDayData.protocolFeesUSD = routerDayData.protocolFeesUSD + protocolFeeAmounts.usd;

  poolDayData.volumeUSD = poolDayData.volumeUSD + volumeUSD;
  poolDayData.volumeJetton0 = poolDayData.volumeJetton0 + amount0Abs;
  poolDayData.volumeJetton1 = poolDayData.volumeJetton1 + amount1Abs;
  poolDayData.feesUSD = poolDayData.feesUSD + feesUSD;
  poolDayData.protocolFeesUSD = poolDayData.protocolFeesUSD + protocolFeeAmounts.usd;

  jetton0DayData.volume = jetton0DayData.volume + amount0Abs;
  jetton0DayData.volumeUSD = jetton0DayData.volumeUSD + volumeUSD;
  jetton0DayData.feesUSD = jetton0DayData.feesUSD + feesUSD;
  jetton0DayData.protocolFeesUSD = jetton0DayData.protocolFeesUSD + protocolFeeAmounts.usd;

  jetton1DayData.volume = jetton1DayData.volume + amount1Abs;
  jetton1DayData.volumeUSD = jetton1DayData.volumeUSD + volumeUSD;
  jetton1DayData.feesUSD = jetton1DayData.feesUSD + feesUSD;
  jetton1DayData.protocolFeesUSD = jetton1DayData.protocolFeesUSD + protocolFeeAmounts.usd;

  await db.insert(schema.swap).values({ ...swap });
  await db
    .update(schema.router)
    .set({ ...router })
    .where(eq(schema.router.id, router.id));
  await db
    .update(schema.pool)
    .set({ ...pool })
    .where(eq(schema.pool.id, pool.id));
  await db
    .update(schema.jetton)
    .set({ ...jetton0 })
    .where(eq(schema.jetton.id, jetton0.id));
  await db
    .update(schema.jetton)
    .set({ ...jetton1 })
    .where(eq(schema.jetton.id, jetton1.id));
  await db
    .update(schema.routerData)
    .set({ ...routerDayData })
    .where(eq(schema.routerData.id, routerDayData.id));
  await db
    .update(schema.poolData)
    .set({ ...poolDayData })
    .where(eq(schema.poolData.id, poolDayData.id));
  await db
    .update(schema.jettonData)
    .set({ ...jetton0DayData })
    .where(eq(schema.jettonData.id, jetton0DayData.id));
  await db
    .update(schema.jettonData)
    .set({ ...jetton1DayData })
    .where(eq(schema.jettonData.id, jetton1DayData.id));
};
