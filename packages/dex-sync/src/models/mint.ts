import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';
import { pool } from './pool';
import { jetton } from './jetton';
import { transaction } from './transaction';
import { relations } from 'drizzle-orm';

export const mint = table('mint', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  poolId: t
    .integer('pool_id')
    .references(() => pool.id)
    .notNull(),
  jetton0Id: t
    .integer('jetton0_id')
    .references(() => jetton.id)
    .notNull(),
  jetton1Id: t
    .integer('jetton1_id')
    .references(() => jetton.id)
    .notNull(),
  sender: t.text().notNull(),
  recipient: t.text().notNull(),
  amount0: t.text().notNull(),
  amount1: t.text().notNull(),
  amount: t
    .bigint({
      mode: 'bigint',
    })
    .notNull(),
  amountUSD: t.text('amount_usd').notNull(),
  tickLower: t
    .bigint('tick_lower', {
      mode: 'bigint',
    })
    .notNull(),
  tickUpper: t
    .bigint('tick_upper', {
      mode: 'bigint',
    })
    .notNull(),
  transactionId: t
    .integer('transaction_id')
    .references(() => transaction.id)
    .notNull(),
  timestamp: t.timestamp().notNull(),
});

export const mintRelations = relations(mint, ({ one, many }) => {
  return {
    pool: one(pool, {
      fields: [mint.poolId],
      references: [pool.id],
    }),
    jetton0: one(jetton, {
      fields: [mint.jetton0Id],
      references: [jetton.id],
    }),
    jetton1: one(jetton, {
      fields: [mint.jetton1Id],
      references: [jetton.id],
    }),
    transaction: one(transaction, {
      fields: [mint.transactionId],
      references: [transaction.id],
    }),
  };
});
