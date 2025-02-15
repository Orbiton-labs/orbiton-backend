import { db } from '@src/db';
import { Jetton } from '@src/models';
import { Address } from '@ton/core';
import { tonApiClient } from '@src/services/ton-api';
import * as schema from '@src/models';
import { ZERO_BD, ZERO_BI } from '@src/constants';

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
