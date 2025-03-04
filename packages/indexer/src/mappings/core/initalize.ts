import { InitializeEvent } from '@src/@types/core.type';
import { db } from '@src/db';
import { eq } from 'drizzle-orm';
import * as schema from '@src/models/index';
import { getOrLoadJetton } from '../utils/jetton';
import { Router } from '@src/models/router';
import { findTonPerJetton, getTonPrice } from '../utils/ton';
import { updatePoolDayData } from '../utils/pool';
import { ZERO_BD, ZERO_BI } from '@src/constants';
import BigDecimal from 'js-big-decimal';
import { objectWithoutId } from '../common';

function feeTierToProtocolFeeDefault(feeTier: bigint): bigint {
  if (feeTier === 10000n) {
    return 209718400n;
  }
  if (feeTier === 2500n) {
    return 209718400n;
  }
  if (feeTier === 500n) {
    return 222825800n;
  }
  if (feeTier === 100n) {
    return 216272100n;
  }
  return 209718400n;
}

export const handleInitialize = async (event: InitializeEvent) => {
  const tonPriceUSD = await getTonPrice();
  let router = (await db.query.router.findFirst({})) as Router | undefined;
  if (!router) {
    await db.insert(schema.router).values({
      poolCount: ZERO_BD,
      txCount: ZERO_BD,
      tonPriceUSD: tonPriceUSD.toString(),
      totalFeesTon: ZERO_BD,
      totalFeesUSD: ZERO_BD,
      totalValueLockedTon: ZERO_BD,
      totalValueLockedUSD: ZERO_BD,
      totalVolumeTon: ZERO_BD,
      totalVolumeUSD: ZERO_BD,
      totalProtocolFeesTon: ZERO_BD,
      totalProtocolFeesUSD: ZERO_BD,
    });
    router = (await db.query.router.findFirst()) as Router;
  }
  router.poolCount = (BigInt(router.poolCount) + 1n).toString();

  let jetton0 = await getOrLoadJetton(event.jetton0);
  let jetton1 = await getOrLoadJetton(event.jetton1);
  let feeTier = event.fee;

  jetton0.derivedTon = await findTonPerJetton(jetton0);
  jetton0.derivedUSD = new BigDecimal(jetton0.derivedTon)
    .multiply(new BigDecimal(tonPriceUSD))
    .stripTrailingZero()
    .getValue();
  jetton1.derivedTon = await findTonPerJetton(jetton1);
  jetton1.derivedUSD = new BigDecimal(jetton1.derivedTon)
    .multiply(new BigDecimal(tonPriceUSD))
    .stripTrailingZero()
    .getValue();

  await db.transaction(async (_db) => {
    await _db.insert(schema.transaction).values({
      hash: event.transaction.hash,
      block: event.block.id,
      timestamp: new Date(event.block.timestamp),
    });
    let transaction = await _db.query.transaction.findFirst({
      where: eq(schema.transaction.hash, event.transaction.hash),
    });

    let poolData = {
      address: event.address.toString(),
      jetton0Id: jetton0.id,
      jetton1Id: jetton1.id,
      feeTier,
      collectedFeesJetton0: ZERO_BD,
      collectedFeesJetton1: ZERO_BD,
      collectedFeesUSD: ZERO_BD,
      feeGrowthGlobal0X128: ZERO_BD,
      feeGrowthGlobal1X128: ZERO_BD,
      feeProtocol: feeTierToProtocolFeeDefault(BigInt(feeTier)),
      feesUSD: ZERO_BD,
      protocolFeesUSD: ZERO_BD,
      jetton0Price: ZERO_BD,
      jetton1Price: ZERO_BD,
      liquidity: ZERO_BD,
      liquidityProviderCount: ZERO_BD,
      sqrtPrice: event.sqrtPriceX96.toString(),
      tick: event.tick,
      totalValueLockedJetton0: ZERO_BD,
      totalValueLockedJetton1: ZERO_BD,
      totalValueLockedTon: ZERO_BD,
      totalValueLockedUSD: ZERO_BD,
      txCount: ZERO_BD,
      volumeJetton0: ZERO_BD,
      volumeJetton1: ZERO_BD,
      transactionId: transaction.id,
      volumeUSD: ZERO_BD,
      timestamp: new Date(event.block.timestamp),
    };

    const results = await _db
      .insert(schema.pool)
      .values({ ...poolData })
      .returning({ id: schema.pool.id });
    await updatePoolDayData(
      {
        ...poolData,
        id: results[0].id,
      },
      event,
      _db as any,
    );

    await _db
      .update(schema.router)
      .set(objectWithoutId(router))
      .where(eq(schema.router.id, router.id));
    await _db
      .update(schema.jetton)
      .set(objectWithoutId(jetton0))
      .where(eq(schema.jetton.id, jetton0.id));
    await _db
      .update(schema.jetton)
      .set(objectWithoutId(jetton1))
      .where(eq(schema.jetton.id, jetton1.id));
  });
};
