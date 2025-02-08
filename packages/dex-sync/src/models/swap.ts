import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';

export const swap = table('swap', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  pool: t.text().notNull(),
  jetton0: t.text().notNull(),
  jetton1: t.text().notNull(),
  sender: t.text().notNull(),
  recipient: t.text().notNull(),
  amount0: t.text().notNull(),
  amount1: t.text().notNull(),
  amountUSD: t.text('amount_usd').notNull(),
  amountFeeUSD: t.text('amount_fee_usd').notNull(),
  sqrtPriceX96: t.text('sqrt_price_x96').notNull(),
  tick: t.integer().notNull(),
  transaction: t.text().notNull(),
  timestamp: t.integer().notNull(),
});
