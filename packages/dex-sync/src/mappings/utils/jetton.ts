import { db } from '@src/db';
import { Jetton } from '@src/models';
import { Address } from '@ton/core';
import { tonApiClient } from '@src/services/ton-api';
import * as schema from '@src/models';
import { ONE_BI, ZERO_BD, ZERO_BI } from '@src/constants';
import BigDecimal from 'js-big-decimal';

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
