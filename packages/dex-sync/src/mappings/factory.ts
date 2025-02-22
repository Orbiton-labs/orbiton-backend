import { PoolCreated } from '@src/@types/index';
import { db } from '@src/db';
import { Router } from '@src/models/router';
import * as schema from '@src/models/index';
import { ZERO_BD, ZERO_BI } from '@src/constants';
import { getOrLoadJetton } from './utils/jetton';
import { eq } from 'drizzle-orm';
import { getTonPrice } from './utils/ton';
import { tonApiClient } from '@src/services/ton-api';
import { tonNode_BlockIdExt } from '@orbiton/ton-lite-client/dist/schema';
import { encodeBlockId } from './utils/block';

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

export const handlePoolCreated = async (event: PoolCreated) => {
  const tonPriceUSD = await getTonPrice();
  let router = (await db.query.router.findFirst({})) as Router | undefined;
  if (!router) {
    await db.insert(schema.router).values({
      poolCount: ZERO_BI,
      txCount: ZERO_BI,
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
  router.poolCount += 1n;
  let jetton0 = await getOrLoadJetton(event.jetton0);
  let jetton1 = await getOrLoadJetton(event.jetton1);
  let feeTier = event.fee;

  await db.insert(schema.transaction).values({
    hash: event.transaction.hash,
    block: event.block,
    timestamp: new Date(event.block.timestamp),
  });
  let transaction = await db.query.transaction.findFirst({
    where: eq(schema.transaction.hash, event.transaction.hash),
  });

  let poolData = {
    address: event.poolAddress.toString(),
    jetton0Id: jetton0.id,
    jetton1Id: jetton1.id,
    feeTier,
    collectedFeesJetton0: ZERO_BD,
    collectedFeesJetton1: ZERO_BD,
    collectedFeesUSD: ZERO_BD,
    feeGrowthGlobal0X128: ZERO_BI,
    feeGrowthGlobal1X128: ZERO_BI,
    feeProtocol: feeTierToProtocolFeeDefault(BigInt(feeTier)),
    feesUSD: ZERO_BD,
    protocolFeesUSD: ZERO_BD,
    jetton0Price: ZERO_BD,
    jetton1Price: ZERO_BD,
    liquidity: ZERO_BI,
    liquidityProviderCount: ZERO_BI,
    sqrtPrice: ZERO_BI,
    tick: ZERO_BI,
    totalValueLockedJetton0: ZERO_BD,
    totalValueLockedJetton1: ZERO_BD,
    totalValueLockedTon: ZERO_BD,
    totalValueLockedUSD: ZERO_BD,
    txCount: ZERO_BI,
    volumeJetton0: ZERO_BD,
    volumeJetton1: ZERO_BD,
    transactionId: transaction.id,
    volumeUSD: ZERO_BD,
    timestamp: new Date(event.block.timestamp),
  };
  await db.insert(schema.pool).values({ ...poolData });
};
