import { BurnEvent } from '@src/@types/core.type';
import { db } from '@src/db';
import { Router } from '@src/models';
import { eq } from 'drizzle-orm';
import * as schema from '@src/models';
import { getOrLoadJetton } from '../utils/jetton';
import { Address } from '@ton/core';

export const handleBurn = async (burn: BurnEvent) => {
  const router = (await db.query.router.findFirst({})) as Router | undefined;
  if (!router) {
    return;
  }

  let poolAddress = burn.address;
  let pool = await db.query.pool.findFirst({
    where: eq(schema.pool.address, poolAddress.toString()),
  });
  if (!pool) {
    return;
  }

  let jetton0 = await getOrLoadJetton(Address.parse(pool.jetton0Id));
  let jetton1 = await getOrLoadJetton(Address.parse(pool.jetton1Id));
};
