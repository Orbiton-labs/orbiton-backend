import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';
import { pool } from './pool';
import { jetton } from './jetton';
import { transaction } from './transaction';
import { InferSelectModel, relations } from 'drizzle-orm';

export const mint = table('mints', {
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
  owner: t.text().notNull(),
  amount0: t.text().notNull(),
  amount1: t.text().notNull(),
  amount: t.text().notNull(),
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

export type Mint = InferSelectModel<typeof mint>;
