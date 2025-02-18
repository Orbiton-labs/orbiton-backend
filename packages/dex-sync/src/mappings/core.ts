import { Initialize, MintEvent } from '@src/@types/core.type';
import { db } from '@src/db';
import { eq } from 'drizzle-orm';
import * as schema from '@src/models/index';
import { convertJettonToDecimal, getOrLoadJetton } from './utils/jetton';
import { Address } from '@ton/core';
import { Router } from '@src/models/router';
import { findTonPerJetton, getTonPrice } from './utils/ton';
import { updatePoolDayData } from './utils/pool';
import BigDecimal from 'js-big-decimal';
import { AmountType, getAdjustedAmounts } from './utils/pricing';

export const handleInitialize = async (event: Initialize) => {
  let pool = await db.query.pool.findFirst({
    where: eq(schema.pool.address, event.poolAddress),
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
};

export const handleMint = async (mint: MintEvent) => {
  let router = (await db.query.router.findFirst({})) as Router | undefined;
  if (!router) {
    return;
  }
  let pool = await db.query.pool.findFirst({
    where: eq(schema.pool.address, mint.poolAddress),
    with: {
      jetton0: true,
      jetton1: true,
    },
  });
  if (!pool) {
    return;
  }
  let jetton0 = await getOrLoadJetton(Address.parse(pool.jetton0.address));
  let jetton1 = await getOrLoadJetton(Address.parse(pool.jetton1.address));
  let amount0 = convertJettonToDecimal(mint.amount0, jetton0);
  let amount1 = convertJettonToDecimal(mint.amount1, jetton1);
  let amountUSD = amount0
    .multiply(new BigDecimal(jetton0.derivedTon).multiply(new BigDecimal(router.tonPriceUSD)))
    .add(
      amount1.multiply(
        new BigDecimal(jetton1.derivedTon).multiply(new BigDecimal(router.tonPriceUSD)),
      ),
    );
  let oldPoolTVLTon = pool.totalValueLockedTon;
  jetton0.totalValueLocked = new BigDecimal(jetton0.totalValueLocked).add(amount0).toString();
  jetton1.totalValueLocked = new BigDecimal(jetton1.totalValueLocked).add(amount1).toString();
  pool.totalValueLockedJetton0 = new BigDecimal(pool.totalValueLockedJetton0)
    .add(amount0)
    .toString();
  pool.totalValueLockedJetton1 = new BigDecimal(pool.totalValueLockedJetton1)
    .add(amount1)
    .toString();
};
