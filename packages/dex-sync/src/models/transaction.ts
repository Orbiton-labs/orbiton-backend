import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';

export const transaction = table('transactions', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  hash: t.text().unique().notNull(),
  block: t.text().notNull(),
  updatedAt: t.timestamp('updated_at').defaultNow().notNull(),
  createdAt: t.timestamp('created_at').defaultNow().notNull(),
});
