import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';

export const routerData = table('router-data', {
  id: t.text().primaryKey().notNull(),
  volumeTon: t.text('volume_ton').notNull(),
  volumeUSD: t.text('volume_usd').notNull(),
  feesUSD: t.text('fees_usd').notNull(),
  protocolFeesUSD: t.text('protocol_fees_usd').notNull(),
  txCount: t.bigint('tx_count', { mode: 'bigint' }).notNull(),
  tvlUSD: t.text('tvl_usd').notNull(),
  timestamp: t.timestamp().notNull(),
});
