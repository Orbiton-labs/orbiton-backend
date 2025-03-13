import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';
import { transaction } from './transaction';
import { jetton } from './jetton';
import { InferSelectModel, relations } from 'drizzle-orm';

export const pool = table('pools', {
  id: t.text().notNull().primaryKey(),
  transactionId: t
    .text('transaction_id')
    .references(() => transaction.id)
    .notNull(),
  jetton0Id: t
    .text('jetton0_id')
    .references(() => jetton.id)
    .notNull(),
  jetton1Id: t
    .text('jetton1_id')
    .references(() => jetton.id)
    .notNull(),
  feeTier: t
    .bigint('fee_tier', {
      mode: 'bigint',
    })
    .notNull(),
  feeProtocol: t
    .bigint('fee_protocol', {
      mode: 'bigint',
    })
    .notNull(),
  tickSpacing: t
    .bigint('tick_spacing', {
      mode: 'bigint',
    })
    .notNull(),
  liquidity: t.text().notNull(),
  sqrtPrice: t.text('sqrt_price').notNull(),
  feeGrowthGlobal0X128: t.text('fee_growth_global_0x128').notNull(),
  feeGrowthGlobal1X128: t.text('fee_growth_global_1x128').notNull(),
  tick: t
    .bigint({
      mode: 'bigint',
    })
    .notNull(),
  feesUSD: t.text('fees_usd').notNull(),
  protocolFeesUSD: t.text('protocol_fees_usd').notNull(),
  collectedFeesJetton0: t.text('collected_fees_jetton0').notNull(),
  collectedFeesJetton1: t.text('collected_fees_jetton1').notNull(),
  collectedFeesUSD: t.text('collected_fees_usd').notNull(),
  totalValueLockedJetton0: t.text('total_value_locked_jetton0').notNull(),
  totalValueLockedJetton1: t.text('total_value_locked_jetton1').notNull(),
  totalValueLockedTon: t.text('total_value_locked_ton').notNull(),
  totalValueLockedUSD: t.text('total_value_locked_usd').notNull(),
  jetton0Price: t.text('jetton0_price').notNull(),
  jetton1Price: t.text('jetton1_price').notNull(),
  volumeJetton0: t.text('volume_jetton0').notNull(),
  volumeJetton1: t.text('volume_jetton1').notNull(),
  volumeUSD: t.text('volume_usd').notNull(),
  txCount: t.text('tx_count').notNull(),
  liquidityProviderCount: t.text('liquidity_provider_count').notNull(),
  timestamp: t.timestamp('timestamp').notNull(),
});

export const poolRelations = relations(pool, ({ one, many }) => {
  return {
    jetton0: one(jetton, {
      fields: [pool.jetton0Id],
      references: [jetton.id],
    }),
    jetton1: one(jetton, {
      fields: [pool.jetton1Id],
      references: [jetton.id],
    }),
  };
});

export type Pool = InferSelectModel<typeof pool>;
