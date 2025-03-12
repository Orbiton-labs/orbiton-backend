import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';
import { pool } from './pool';
import { InferSelectModel, relations } from 'drizzle-orm';
import { transaction } from './transaction';

export const collect = table('collects', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  transactionId: t
    .text('transaction_id')
    .references(() => transaction.id)
    .notNull(),
  poolId: t
    .text('pool_id')
    .references(() => pool.id)
    .notNull(),
  owner: t.text().notNull(),
  amount0: t.text().notNull(),
  amount1: t.text().notNull(),
  amountUSD: t.text().notNull(),
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
  timestamp: t.timestamp(),
});

export const collectRelations = relations(collect, ({ one }) => {
  return {
    pool: one(pool, {
      fields: [collect.poolId],
      references: [pool.id],
    }),
  };
});

export type Collect = InferSelectModel<typeof collect>;
export type CollectWithoutId = Omit<Collect, 'id'>;
