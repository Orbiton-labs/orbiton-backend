import { TraceEvent } from '@src/@types';
import { Pool } from '@src/models';
import { DatabaseType, db } from '@src/db';
import * as schema from '@src/models';
import { eq } from 'drizzle-orm';
import { ONE_DAY_IN_MILLISECONDS, ZERO_BD } from '@src/constants';

export const updatePoolDayData = async (pool: Pool, event: TraceEvent, _db: DatabaseType = db) => {
  let timestamp = event.block.timestamp;
  let dayID = Math.floor(timestamp / ONE_DAY_IN_MILLISECONDS);
  let dayStartTimestamp = dayID * ONE_DAY_IN_MILLISECONDS;
  let dayPoolID = event.transaction.hash.concat('-').concat(dayID.toString());
  let poolDayData = await _db.query.poolData.findFirst({
    where: eq(schema.poolData.id, dayPoolID),
  });
  if (!poolDayData) {
    poolDayData = {
      ...poolDayData,
      id: dayPoolID,
      poolId: pool.id,
      volumeJetton0: ZERO_BD,
      volumeJetton1: ZERO_BD,
      volumeUSD: ZERO_BD,
      feesUSD: ZERO_BD,
      protocolFeesUSD: ZERO_BD,
      txCount: ZERO_BD,
      feeGrowthGlobal0X128: ZERO_BD,
      feeGrowthGlobal1X128: ZERO_BD,
      timestamp: new Date(dayStartTimestamp),
    };
  }
  poolDayData.liquidity = pool.liquidity;
  poolDayData.sqrtPrice = pool.sqrtPrice;
  poolDayData.feeGrowthGlobal0X128 = pool.feeGrowthGlobal0X128;
  poolDayData.feeGrowthGlobal1X128 = pool.feeGrowthGlobal1X128;
  poolDayData.jetton0Price = pool.jetton0Price;
  poolDayData.jetton1Price = pool.jetton1Price;
  poolDayData.tick = pool.tick;
  poolDayData.tvlUSD = pool.totalValueLockedUSD;
  poolDayData.txCount = (BigInt(poolDayData.txCount) + 1n).toString();
  await _db
    .insert(schema.poolData)
    .values({ ...poolDayData })
    .onConflictDoUpdate({
      target: schema.poolData.id,
      set: {
        timestamp: poolDayData.timestamp,
        poolId: poolDayData.poolId,
        volumeJetton0: poolDayData.volumeJetton0,
        volumeJetton1: poolDayData.volumeJetton1,
        volumeUSD: poolDayData.volumeUSD,
        feesUSD: poolDayData.feesUSD,
        protocolFeesUSD: poolDayData.protocolFeesUSD,
        txCount: poolDayData.txCount,
        feeGrowthGlobal0X128: poolDayData.feeGrowthGlobal0X128,
        feeGrowthGlobal1X128: poolDayData.feeGrowthGlobal1X128,
        liquidity: poolDayData.liquidity,
        sqrtPrice: poolDayData.sqrtPrice,
        jetton0Price: poolDayData.jetton0Price,
        jetton1Price: poolDayData.jetton1Price,
        tick: poolDayData.tick,
        tvlUSD: poolDayData.tvlUSD,
      },
    });
  return poolDayData;
};
