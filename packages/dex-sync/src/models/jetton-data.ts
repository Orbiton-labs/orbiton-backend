import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';

export const jettonData = table('jetton_data', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  date: t.integer().notNull(),
  jetton: t.text().notNull(),
  volume: t.text().notNull(),
  volumeUSD: t.text('volume_usd').notNull(),
  totalValueLocked: t.text('total_value_locked').notNull(),
  totalValueLockedUSD: t.text('total_value_locked_usd').notNull(),
  priceUSD: t.text('price_usd').notNull(),
  feesUSD: t.text('fees_usd').notNull(),
  protocolFeesUSD: t.text('protocol_fees_usd').notNull(),
});
