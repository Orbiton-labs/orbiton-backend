import { CollectEvent } from '@src/@types/core.type';
import { db } from '@src/db';
import { Router } from '@src/models';
import { eq } from 'drizzle-orm';
import * as schema from '@src/models';
import { convertJettonToDecimal, getOrLoadJetton } from '../utils/jetton';
import { Address } from '@ton/core';
import { loadTransaction } from '../utils';
import { getAdjustedAmounts } from '../utils/pricing';
import BigDecimal from 'js-big-decimal';
import { ONE_BI } from '@src/constants';
import { CollectWithoutId } from '@src/models/collect';
import { objectWithoutId } from '../common';

export const handleCollect = async (event: CollectEvent) => {
  let router = (await db.query.router.findFirst({})) as Router | undefined;
  if (!router) {
    return;
  }

  let poolAddress = event.address.toString();
  let pool = await db.query.pool.findFirst({
    where: eq(schema.pool.address, poolAddress),
  });
  if (!pool) {
    return;
  }

  let jetton0 = await getOrLoadJetton(Address.parse(pool.jetton0Id));
  let jetton1 = await getOrLoadJetton(Address.parse(pool.jetton1Id));
  let transaction = await loadTransaction(event);

  // get formatted amounts collected
  let amount0 = convertJettonToDecimal(event.amount0, jetton0);
  let amount1 = convertJettonToDecimal(event.amount1, jetton1);
  let amounts = getAdjustedAmounts(router, amount0, jetton0, amount1, jetton1);

  pool.collectedFeesJetton0 = new BigDecimal(pool.collectedFeesJetton0)
    .add(amount0)
    .stripTrailingZero()
    .getValue();
  pool.collectedFeesJetton1 = new BigDecimal(pool.collectedFeesJetton1)
    .add(amount1)
    .stripTrailingZero()
    .getValue();
  pool.collectedFeesUSD = new BigDecimal(pool.collectedFeesUSD)
    .add(amounts.usd)
    .stripTrailingZero()
    .getValue();

  // update transaction counts
  router.txCount = (BigInt(router.txCount) + ONE_BI).toString();
  jetton0.txCount = (BigInt(jetton0.txCount) + ONE_BI).toString();
  jetton1.txCount = (BigInt(jetton1.txCount) + ONE_BI).toString();
  pool.txCount = (BigInt(pool.txCount) + ONE_BI).toString();

  let collectData = {
    transactionId: transaction.id,
    poolId: pool.id,
    jetton0Id: jetton0.id,
    jetton1Id: jetton1.id,
    amount0: amount0.toString(),
    amount1: amount1.toString(),
    amountUSD: amounts.usd.toString(),
    owner: event.owner.toString(),
    tickLower: event.tickLower,
    tickUpper: event.tickUpper,
    timestamp: new Date(event.block.timestamp),
  } as CollectWithoutId;

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
  await db.update(schema.pool).set(objectWithoutId(pool)).where(eq(schema.pool.id, pool.id));
  await db.insert(schema.collect).values(collectData);
};
