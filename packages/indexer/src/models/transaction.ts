import { InferSelectModel, relations } from 'drizzle-orm';
import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';

export const transaction = table('transactions', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  hash: t.text().unique().notNull(),
  block: t.json().notNull(),
  timestamp: t.timestamp().notNull(),
});

export type Transaction = InferSelectModel<typeof transaction>;
