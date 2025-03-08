import { CollectProtocolEvent } from '@src/@types/core.type';
import { db } from '@src/db';
import { eq } from 'drizzle-orm';
import * as schema from '@src/models';
import { Router } from '@src/models';
import { convertJettonToDecimal, getOrLoadJetton } from '../utils/jetton';
import { Address } from '@ton/core';
import BigDecimal from 'decimal.js';
import { updateDerivedTVLAmounts } from '../utils/tvl';
import { ONE_BI } from '@src/constants';
import { objectWithoutId } from '../common';
import { BigDecimalConfig } from '../constant';

BigDecimal.set(BigDecimalConfig);
export const handleCollectProtocol = async (event: CollectProtocolEvent) => {
  let pool = await db.query.pool.findFirst({
    where: eq(schema.pool.address, event.address.toString()),
  });
  if (!pool) {
    return;
  }

  let router = (await db.query.router.findFirst({})) as Router | undefined;
  if (!router) {
    return;
  }
  let jetton0 = await getOrLoadJetton(Address.parse(pool.jetton0Id));
  let jetton1 = await getOrLoadJetton(Address.parse(pool.jetton1Id));

  // get formatted amounts collected
  let amount0 = convertJettonToDecimal(event.amount0, jetton0);
  let amount1 = convertJettonToDecimal(event.amount1, jetton1);

  // adjust pool TVL based on amount collected
  let oldPoolTVLTon = pool.totalValueLockedTon;
  pool.totalValueLockedJetton0 = new BigDecimal(pool.totalValueLockedJetton0)
    .sub(amount0)

    .toString();
  pool.totalValueLockedJetton1 = new BigDecimal(pool.totalValueLockedJetton1)
    .sub(amount1)

    .toString();
  jetton0.totalValueLocked = new BigDecimal(jetton0.totalValueLocked)
    .sub(amount0)

    .toString();
  jetton1.totalValueLocked = new BigDecimal(jetton1.totalValueLocked)
    .sub(amount1)

    .toString();
  const data = await updateDerivedTVLAmounts(
    router,
    pool,
    jetton0,
    jetton1,
    new BigDecimal(oldPoolTVLTon),
  );
  router = data.router;
  pool = data.pool;
  jetton0 = data.jetton0;
  jetton1 = data.jetton1;

  // update transaction counts
  router.txCount = (BigInt(router.txCount) + ONE_BI).toString();
  jetton0.txCount = (BigInt(jetton0.txCount) + ONE_BI).toString();
  jetton1.txCount = (BigInt(jetton1.txCount) + ONE_BI).toString();
  pool.txCount = (BigInt(pool.txCount) + ONE_BI).toString();

  await db.update(schema.pool).set(objectWithoutId(pool)).where(eq(schema.pool.id, pool.id));
  await db
    .update(schema.router)
    .set(objectWithoutId(router))
    .where(eq(schema.router.id, router.id));
  await db
    .update(schema.jetton)
    .set(objectWithoutId(jetton0))
    .where(eq(schema.jetton.id, jetton0.id));
  await db
    .update(schema.jetton)
    .set(objectWithoutId(jetton1))
    .where(eq(schema.jetton.id, jetton1.id));
};
