import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';
import { transaction } from './transaction';
import { jetton } from './jetton';
import { InferSelectModel, relations } from 'drizzle-orm';
import { poolData } from './pool-data';
import { position } from './position';
import { positionData } from './position-data';
import { mint } from './mint';
import { swap } from './swap';
import { burn } from './burn';
import { tick } from './tick';

export const pool = table('pools', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  address: t.text().unique().notNull(),
  transactionId: t
    .integer('transaction_id')
    .references(() => transaction.id)
    .notNull(),
  jetton0Id: t
    .integer('jetton0_id')
    .references(() => jetton.id)
    .notNull(),
  jetton1Id: t
    .integer('jetton1_id')
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
  feeGrowthGlobal0X128: t
    .bigint('fee_growth_global_0x128', {
      mode: 'bigint',
    })
    .notNull(),
  feeGrowthGlobal1X128: t
    .bigint('fee_growth_global_1x128', {
      mode: 'bigint',
    })
    .notNull(),
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
  txCount: t
    .bigint('tx_count', {
      mode: 'bigint',
    })
    .notNull(),
  liquidityProviderCount: t
    .bigint('liquidity_provider_count', {
      mode: 'bigint',
    })
    .notNull(),
  timestamp: t.timestamp('timestamp').notNull(),
});

export const poolRelations = relations(pool, ({ one, many }) => {
  return {
    transaction: one(transaction, {
      fields: [pool.transactionId],
      references: [transaction.id],
    }),
    jetton0: one(jetton, {
      fields: [pool.jetton0Id],
      references: [jetton.id],
    }),
    jetton1: one(jetton, {
      fields: [pool.jetton1Id],
      references: [jetton.id],
    }),
    poolData: many(poolData),
    position: many(position),
    positionData: many(positionData),
    mint: many(mint),
    swap: many(swap),
    burn: many(burn),
    tick: many(tick),
  };
});

export type Pool = InferSelectModel<typeof pool>;
