import { InferSelectModel } from 'drizzle-orm';
import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';

export const jetton = table('jettons', {
  id: t.text().primaryKey().notNull(),
  name: t.text().notNull(),
  symbol: t.text().notNull(),
  decimals: t.integer().notNull(),
  image: t.text(),
  description: t.text(),
  totalSupply: t.text('total_supply').notNull(),
  poolCount: t.text('pool_count').notNull(),
  txCount: t.text('tx_count').notNull(),
  volume: t.text().notNull(),
  volumeUSD: t.text('volume_usd').notNull(),
  feesUSD: t.text('fees_usd').notNull(),
  protocolFeesUSD: t.text('protocol_fees_usd').notNull(),
  totalValueLocked: t.text('total_value_locked').notNull(),
  totalValueLockedUSD: t.text('total_value_locked_usd').notNull(),
  derivedTon: t.text('derived_ton').notNull(),
  derivedUSD: t.text('derived_usd').notNull(),
});

export type Jetton = InferSelectModel<typeof jetton>;
