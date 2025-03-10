import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';
import { InferSelectModel } from 'drizzle-orm';

export const meta = table('meta', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  seqno: t
    .bigint({
      mode: 'number',
    })
    .notNull(),
});

export type Meta = InferSelectModel<typeof meta>;
