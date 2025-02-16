import { TraceTx } from '@src/@types';
import { Pool } from '@src/models';
import { tonApiClient } from '@src/services/ton-api';
import { encodeBlockId } from './block';
import { db } from '@src/db';
import * as schema from '@src/models';
import { eq } from 'drizzle-orm';
import { ZERO_BD, ZERO_BI } from '@src/constants';

export const updatePoolDayData = async (pool: Pool, event: TraceTx) => {
  let block = await tonApiClient.blockchain.getBlockchainBlock(encodeBlockId(event.block));
  let timestamp = block.genUtime;
  let dayID = timestamp / 86400;
  let dayStartTimestamp = dayID * 86400;
  let dayPoolID = event.transactionHash.concat('-').concat(dayID.toString());
  let poolDayData = await db.query.poolData.findFirst({
    where: eq(schema.poolData.id, dayPoolID),
  });
  if (!poolDayData) {
    poolDayData = {
      ...poolDayData,
      date: dayStartTimestamp,
      poolId: pool.id,
      volumeJetton0: ZERO_BD,
      volumeJetton1: ZERO_BD,
      volumeUSD: ZERO_BD,
      feesUSD: ZERO_BD,
      protocolFeesUSD: ZERO_BD,
      txCount: ZERO_BI,
      feeGrowthGlobal0X128: ZERO_BI,
      feeGrowthGlobal1X128: ZERO_BI,
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
  poolDayData.txCount += 1n;
  await db
    .insert(schema.poolData)
    .values({ ...poolDayData })
    .onConflictDoUpdate({
      target: schema.poolData.id,
      set: {
        date: poolDayData.date,
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
};
