import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';
import { pool } from './pool';
import { jetton } from './jetton';
import { transaction } from './transaction';
import { InferSelectModel, relations } from 'drizzle-orm';

export const swap = table('swaps', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  poolId: t
    .integer('pool_id')
    .references(() => pool.id)
    .notNull(),
  jetton0Id: t
    .text('jetton0_id')
    .references(() => jetton.id)
    .notNull(),
  jetton1Id: t
    .text('jetton1_id')
    .references(() => jetton.id)
    .notNull(),
  sender: t.text().notNull(),
  recipient: t.text().notNull(),
  amount0: t.text().notNull(),
  amount1: t.text().notNull(),
  amountUSD: t.text('amount_usd').notNull(),
  amountFeeUSD: t.text('amount_fee_usd').notNull(),
  sqrtPriceX96: t.text('sqrt_price_x96').notNull(),
  tick: t
    .bigint({
      mode: 'bigint',
    })
    .notNull(),
  transactionId: t
    .integer('transaction_id')
    .references(() => transaction.id)
    .notNull(),
  timestamp: t.timestamp().notNull(),
});

export const swapRelations = relations(swap, ({ one, many }) => {
  return {
    pool: one(pool, {
      fields: [swap.poolId],
      references: [pool.id],
    }),
    jetton0: one(jetton, {
      fields: [swap.jetton0Id],
      references: [jetton.id],
    }),
    jetton1: one(jetton, {
      fields: [swap.jetton1Id],
      references: [jetton.id],
    }),
    transaction: one(transaction, {
      fields: [swap.transactionId],
      references: [transaction.id],
    }),
  };
});

export type Swap = InferSelectModel<typeof swap>;
