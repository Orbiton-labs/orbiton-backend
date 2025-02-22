import { db } from '@src/db';
import { Jetton, Router } from '@src/models';
import { Address } from '@ton/core';
import { tonApiClient } from '@src/services/ton-api';
import * as schema from '@src/models';
import { ONE_BI, ONE_DAY_IN_MILLISECONDS, ZERO_BD, ZERO_BI } from '@src/constants';
import BigDecimal from 'js-big-decimal';
import { TraceEvent } from '@src/@types';
import { eq } from 'drizzle-orm';

export const getOrLoadJetton = async (address: Address) => {
  //@ts-ignore
  let jetton = (await db.query.jetton.findFirst()) as Jetton | undefined;
  if (!jetton) {
    const jettonInfo = await tonApiClient.jettons.getJettonInfo(address);
    await db.insert(schema.jetton).values({
      name: jettonInfo.metadata.name,
      symbol: jettonInfo.metadata.symbol,
      address: jettonInfo.metadata.address.toString(),
      decimals: Number(jettonInfo.metadata.decimals),
      totalSupply: jettonInfo.totalSupply,
      derivedTon: ZERO_BD,
      derivedUSD: ZERO_BD,
      feesUSD: ZERO_BD,
      poolCount: ZERO_BI,
      txCount: ZERO_BI,
      protocolFeesUSD: ZERO_BD,
      totalValueLocked: ZERO_BD,
      totalValueLockedUSD: ZERO_BD,
      volume: ZERO_BD,
      volumeUSD: ZERO_BD,
    });
    //@ts-ignore
    jetton = (await db.query.jetton.findFirst()) as Jetton;
  }
  return jetton;
};

export const updateJettonDayData = async (router: Router, jetton: Jetton, event: TraceEvent) => {
  let timestamp = event.block.timestamp;
  let dayID = timestamp / ONE_DAY_IN_MILLISECONDS;
  let dayStartTimestamp = dayID * ONE_DAY_IN_MILLISECONDS;
  let jettonDayID = jetton.id.toString().concat('-').concat(dayID.toString());
  let jettonDayData = await db.query.jettonData.findFirst({
    where: eq(schema.jettonData.id, jettonDayID),
  });
  if (!jettonDayData) {
    jettonDayData = {
      id: jettonDayID,
      timestamp: new Date(dayStartTimestamp),
      feesUSD: ZERO_BD,
      volume: ZERO_BD,
      volumeUSD: ZERO_BD,
      jettonId: jetton.id,
      priceUSD: ZERO_BD,
      protocolFeesUSD: ZERO_BD,
      totalValueLocked: ZERO_BD,
      totalValueLockedUSD: ZERO_BD,
    };
  }
  jettonDayData.priceUSD = jetton.derivedUSD;
  jettonDayData.totalValueLocked = jetton.totalValueLocked;
  jettonDayData.totalValueLockedUSD = jetton.totalValueLockedUSD;
  await db
    .insert(schema.jettonData)
    .values({ ...jettonDayData })
    .onConflictDoUpdate({
      target: schema.jettonData.id,
      set: {
        timestamp: jettonDayData.timestamp,
        feesUSD: jettonDayData.feesUSD,
        volume: jettonDayData.volume,
        volumeUSD: jettonDayData.volumeUSD,
        jettonId: jettonDayData.jettonId,
        priceUSD: jettonDayData.priceUSD,
        protocolFeesUSD: jettonDayData.protocolFeesUSD,
        totalValueLocked: jettonDayData.totalValueLocked,
        totalValueLockedUSD: jettonDayData.totalValueLockedUSD,
      },
    });
  return jettonDayData;
};

export function convertJettonToDecimal(tokenAmount: bigint, jetton: Jetton | null): BigDecimal {
  if (jetton === null || ZERO_BI === BigInt(jetton.decimals)) {
    return new BigDecimal(tokenAmount.toString());
  }
  return new BigDecimal(tokenAmount.toString()).divide(
    exponentToBigDecimal(BigInt(jetton.decimals)),
  );
}

export function exponentToBigDecimal(decimals: bigint): BigDecimal {
  let bd = new BigDecimal('1');
  for (let i = ZERO_BI; i < decimals; i = i + ONE_BI) {
    bd = bd.multiply(new BigDecimal('10'));
  }
  return bd;
}
