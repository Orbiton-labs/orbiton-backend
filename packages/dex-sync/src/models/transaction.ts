import { InferSelectModel, relations } from 'drizzle-orm';
import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';
import { pool } from './pool';
import { position } from './position';
import { mint } from './mint';
import { swap } from './swap';
import { burn } from './burn';

export const transaction = table('transactions', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  hash: t.text().unique().notNull(),
  block: t.json().notNull(),
  updatedAt: t.timestamp('updated_at').defaultNow().notNull(),
  createdAt: t.timestamp('created_at').defaultNow().notNull(),
});

export const transactionRelations = relations(transaction, ({ many, one }) => {
  return {
    pool: one(pool, {
      fields: [transaction.id],
      references: [pool.transactionId],
    }),
    position: one(position, {
      fields: [transaction.id],
      references: [position.transactionId],
    }),
    mint: one(mint, {
      fields: [transaction.id],
      references: [mint.transactionId],
    }),
    swap: one(swap, {
      fields: [transaction.id],
      references: [swap.transactionId],
    }),
    burn: one(burn, {
      fields: [transaction.id],
      references: [burn.transactionId],
    }),
  };
});

export type Transaction = InferSelectModel<typeof transaction>;
