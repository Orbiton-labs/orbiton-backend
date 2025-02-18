import { Jetton, Pool, Router } from '@src/models';
import BigDecimal from 'js-big-decimal';
import { AmountType, getAdjustedAmounts } from './pricing';
import { db } from '@src/db';
import * as schema from '@src/models';
import { eq } from 'drizzle-orm';

/**
 * Updates all dervived TVL values. This includes all TON and USD
 * TVL metrics for a given pool, as well as in the aggregate factory.
 *
 * NOTE: tokens locked should be updated before this function is called,
 * as this logic starts its calculations based on TVL for token0 and token1
 * in the pool.
 *
 * This function should be used whenever the TVL of tokens changes within a pool.
 * Aka: mint, burn, swap, collect
 */
export async function updateDerivedTVLAmounts(
  router: Router,
  pool: Pool,
  jetton0: Jetton,
  jetton1: Jetton,
  oldPoolTotalValueLockedTon: BigDecimal,
) {
  jetton0.totalValueLockedUSD = new BigDecimal(jetton0.totalValueLocked)
    .multiply(new BigDecimal(jetton0.derivedTon))
    .multiply(new BigDecimal(router.tonPriceUSD))
    .getValue();
  jetton1.totalValueLockedUSD = new BigDecimal(jetton1.totalValueLocked)
    .multiply(new BigDecimal(jetton1.derivedTon))
    .multiply(new BigDecimal(router.tonPriceUSD))
    .getValue();
  let amounts: AmountType = getAdjustedAmounts(
    router,
    new BigDecimal(pool.totalValueLockedJetton0),
    jetton0,
    new BigDecimal(pool.totalValueLockedJetton1),
    jetton1,
  );
  // Update pool TVL values.
  pool.totalValueLockedTon = amounts.ton.getValue();
  pool.totalValueLockedUSD = amounts.usd.getValue();

  /**
   * ----- RESET ------
   * We need to reset router values before updating with new amounts.
   */
  router.totalValueLockedTon = new BigDecimal(router.totalValueLockedTon)
    .subtract(oldPoolTotalValueLockedTon)
    .getValue();
  router.totalValueLockedTon = new BigDecimal(router.totalValueLockedTon)
    .add(amounts.ton)
    .getValue();
  router.totalValueLockedUSD = new BigDecimal(router.totalValueLockedTon)
    .multiply(new BigDecimal(router.tonPriceUSD))
    .getValue();
  await db.update(schema.router).set(router).where(eq(schema.router, router.id));
  await db.update(schema.jetton).set(jetton0).where(eq(schema.jetton, jetton0.id));
  await db.update(schema.jetton).set(jetton1).where(eq(schema.jetton, jetton1.id));
}
