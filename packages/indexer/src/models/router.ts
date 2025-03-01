import { InferSelectModel } from 'drizzle-orm';
import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';

export const router = table('routers', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  poolCount: t.text('pool_count').notNull(),
  txCount: t.text('tx_count').notNull(),
  totalVolumeUSD: t.text('total_volume_usd').notNull(),
  totalVolumeTon: t.text('total_volume_ton').notNull(),
  totalFeesUSD: t.text('total_fees_usd').notNull(),
  totalFeesTon: t.text('total_fees_ton').notNull(),
  totalProtocolFeesTon: t.text('total_protocol_fees_ton').notNull(),
  totalProtocolFeesUSD: t.text('total_protocol_fees_usd').notNull(),
  totalValueLockedUSD: t.text('total_value_locked_usd').notNull(),
  totalValueLockedTon: t.text('total_value_locked_ton').notNull(),
  tonPriceUSD: t.text('ton_price_usd').notNull(),
});

export type Router = InferSelectModel<typeof router>;
