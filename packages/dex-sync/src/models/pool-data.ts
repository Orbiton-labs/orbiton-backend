import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';
import { pool } from './pool';
import { relations } from 'drizzle-orm';

export const poolData = table('pool_data', {
  id: t.text().primaryKey().notNull(),
  date: t.integer().notNull(),
  poolId: t
    .integer('pool_id')
    .references(() => pool.id)
    .notNull(),
  liquidity: t
    .bigint({
      mode: 'bigint',
    })
    .notNull(),
  sqrtPrice: t
    .bigint('sqrt_price', {
      mode: 'bigint',
    })
    .notNull(),
  jetton0Price: t.text('jetton0_price').notNull(),
  jetton1Price: t.text('jetton1_price').notNull(),
  tick: t
    .bigint({
      mode: 'bigint',
    })
    .notNull(),
  feeGrowthGlobal0X128: t.bigint('fee_growth_global_0x128', { mode: 'bigint' }).notNull(),
  feeGrowthGlobal1X128: t.bigint('fee_growth_global_1x128', { mode: 'bigint' }).notNull(),
  tvlUSD: t.text('tvl_usd').notNull(),
  volumeJetton0: t.text('volume_jetton0').notNull(),
  volumeJetton1: t.text('volume_jetton1').notNull(),
  volumeUSD: t.text('volume_usd').notNull(),
  feesUSD: t.text('fees_usd').notNull(),
  protocolFeesUSD: t.text('protocol_fees_usd').notNull(),
  txCount: t
    .bigint('tx_count', {
      mode: 'bigint',
    })
    .notNull(),
});

export const poolDataRelations = relations(poolData, ({ one }) => {
  return {
    pool: one(pool, {
      fields: [poolData.poolId],
      references: [pool.id],
    }),
  };
});
