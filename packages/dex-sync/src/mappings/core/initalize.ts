import { Initialize } from '@src/@types/core.type';
import { db } from '@src/db';
import { eq } from 'drizzle-orm';
import * as schema from '@src/models/index';
import { getOrLoadJetton } from '../utils/jetton';
import { Address } from '@ton/core';
import { Router } from '@src/models/router';
import { findTonPerJetton, getTonPrice } from '../utils/ton';
import { updatePoolDayData } from '../utils/pool';

export const handleInitialize = async (event: Initialize) => {
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
  let poolData = {
    ...pool,
    sqrtPrice: event.sqrtPriceX96,
    tick: event.tick,
  };
  await db.insert(schema.pool).values({ ...poolData });
  let jetton0 = await getOrLoadJetton(Address.parse(poolData.jetton0.address));
  let jetton1 = await getOrLoadJetton(Address.parse(poolData.jetton1.address));

  let router = (await db.query.router.findFirst({})) as Router;
  router.tonPriceUSD = (await getTonPrice()).toString();
  await db.update(schema.router).set(router).where(eq(schema.router, router.id));

  await updatePoolDayData(pool, event);

  jetton0.derivedTon = await findTonPerJetton(jetton0);
  jetton1.derivedTon = await findTonPerJetton(jetton1);
  await Promise.all([
    db.update(schema.jetton).set(jetton0).where(eq(schema.jetton, jetton0.id)),
    db.update(schema.jetton).set(jetton1).where(eq(schema.jetton, jetton1.id)),
  ]);
  return poolData;
};
