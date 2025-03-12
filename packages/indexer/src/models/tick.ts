import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';
import { pool } from './pool';
import { InferSelectModel, relations } from 'drizzle-orm';

export const tick = table('ticks', {
  id: t.text().primaryKey().unique().notNull(),
  poolAddress: t.text('pool_address').notNull(),
  tickIdx: t
    .bigint('tick_idx', {
      mode: 'bigint',
    })
    .notNull(),
  poolId: t
    .text('pool_id')
    .references(() => pool.id)
    .notNull(),
  liquidityGross: t.text('liquidity_gross').notNull(),
  liquidityNet: t.text('liquidity_net').notNull(),
  price0: t.text().notNull(),
  price1: t.text().notNull(),
  volumeJetton0: t.text('volume_jetton0').notNull(),
  volumeJetton1: t.text('volume_jetton1').notNull(),
  volumeUSD: t.text('volume_usd').notNull(),
  feesUSD: t.text('fees_usd').notNull(),
  collectedFeesJetton0: t.text('collected_fees_jetton0').notNull(),
  collectedFeesJetton1: t.text('collected_fees_jetton1').notNull(),
  collectedFeesUSD: t.text('collected_fees_usd').notNull(),
  liquidityProviderCount: t.text('liquidity_provider_count'),
  feeGrowthOutside0X128: t.text('fee_growth_outside_0_x128'),
  feeGrowthOutside1X128: t.text('fee_growth_outside_1_x128'),
  timestamp: t.timestamp('timestamp').notNull(),
});

export const tickRelations = relations(tick, ({ one }) => {
  return {
    pool: one(pool, {
      fields: [tick.poolId],
      references: [pool.id],
    }),
  };
});

export type Tick = InferSelectModel<typeof tick>;
