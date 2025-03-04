import { Jetton, Pool, Router } from '@src/models';
import BigDecimal from 'js-big-decimal';
import { AmountType, getAdjustedAmounts } from './pricing';
import { DatabaseType, db } from '@src/db';
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
  _db: DatabaseType = db,
): Promise<{
  router: Router;
  pool: Pool;
  jetton0: Jetton;
  jetton1: Jetton;
}> {
  jetton0.totalValueLockedUSD = new BigDecimal(jetton0.totalValueLocked)
    .multiply(new BigDecimal(jetton0.derivedTon))
    .multiply(new BigDecimal(router.tonPriceUSD))
    .stripTrailingZero()
    .getValue();
  jetton1.totalValueLockedUSD = new BigDecimal(jetton1.totalValueLocked)
    .multiply(new BigDecimal(jetton1.derivedTon))
    .multiply(new BigDecimal(router.tonPriceUSD))
    .stripTrailingZero()
    .getValue();
  let amounts: AmountType = getAdjustedAmounts(
    router,
    new BigDecimal(pool.totalValueLockedJetton0),
    jetton0,
    new BigDecimal(pool.totalValueLockedJetton1),
    jetton1,
  );
  // Update pool TVL values.
  pool.totalValueLockedTon = amounts.ton.stripTrailingZero().getValue();
  pool.totalValueLockedUSD = amounts.usd.stripTrailingZero().getValue();

  /**
   * ----- RESET ------
   * We need to reset router values before updating with new amounts.
   */
  router.totalValueLockedTon = new BigDecimal(router.totalValueLockedTon)
    .subtract(oldPoolTotalValueLockedTon)
    .add(amounts.ton)
    .stripTrailingZero()
    .getValue();
  router.totalValueLockedUSD = new BigDecimal(router.totalValueLockedTon)
    .multiply(new BigDecimal(router.tonPriceUSD))
    .stripTrailingZero()
    .getValue();

  const { id: jetton0Id, ...jetton0Data } = jetton0;
  await _db.update(schema.jetton).set(jetton0Data).where(eq(schema.jetton.id, jetton0.id));
  const { id: jetton1Id, ...jetton1Data } = jetton1;
  await _db.update(schema.jetton).set(jetton1Data).where(eq(schema.jetton.id, jetton1.id));
  const { id: routerId, ...routerData } = router;
  await _db.update(schema.router).set(routerData).where(eq(schema.router.id, router.id));
  const { id: poolId, ...poolData } = pool;
  await _db.update(schema.pool).set(poolData).where(eq(schema.pool.id, pool.id));
  return {
    router,
    pool,
    jetton0,
    jetton1,
  };
}
