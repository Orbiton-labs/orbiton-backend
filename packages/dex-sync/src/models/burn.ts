import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';
import { jetton } from './jetton';
import { pool } from './pool';
import { transaction } from './transaction';
import { InferSelectModel, relations } from 'drizzle-orm';

export const burn = table('burns', {
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
  owner: t.text().notNull(),
  origin: t.text().notNull(),
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

export const burnRelations = relations(burn, ({ one, many }) => {
  return {
    pool: one(pool, {
      fields: [burn.poolId],
      references: [pool.id],
    }),
    jetton0: one(jetton, {
      fields: [burn.jetton0Id],
      references: [jetton.id],
    }),
    jetton1: one(jetton, {
      fields: [burn.jetton1Id],
      references: [jetton.id],
    }),
    transaction: one(transaction, {
      fields: [burn.transactionId],
      references: [transaction.id],
    }),
  };
});

export type Burn = InferSelectModel<typeof burn>;
export type BurnWithoutId = Omit<Burn, 'id'>;
