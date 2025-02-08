import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';

export const jetton = table('jettons', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  name: t.text().notNull(),
  symbol: t.text().notNull(),
  decimals: t.integer().notNull(),
  totalSupply: t.text('total_supply').notNull(),
  address: t.text().notNull(),
  poolCount: t.integer('pool_count').notNull(),
  txCount: t.integer('tx_count').notNull(),
  volume: t.text().notNull(),
  volumeUSD: t.text('volume_usd').notNull(),
  feesUSD: t.text('fees_usd').notNull(),
  protocolFeesUSD: t.text('protocol_fees_usd').notNull(),
  totalValueLocked: t.text('total_value_locked').notNull(),
  totalValueLockedUSD: t.text('total_value_locked_usd').notNull(),
  derivedTon: t.text('derived_ton').notNull(),
  derivedUSD: t.text('derived_usd').notNull(),
});
