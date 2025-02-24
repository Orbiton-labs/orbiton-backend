import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';
import { pool } from './pool';
import { transaction } from './transaction';
import { jetton } from './jetton';
import { relations } from 'drizzle-orm';
import { positionData } from './position-data';

export const position = table('positions', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  poolId: t
    .integer('pool_id')
    .references(() => pool.id)
    .notNull(),
  transactionId: t
    .integer('transaction_id')
    .references(() => transaction.id)
    .notNull(),
  owner: t.text().notNull(),
  jetton0Id: t
    .text('jetton0_id')
    .references(() => jetton.id)
    .notNull(),
  jetton1Id: t
    .text('jetton2_id')
    .references(() => jetton.id)
    .notNull(),
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
  liquidity: t
    .bigint({
      mode: 'bigint',
    })
    .notNull(),
  depositedJetton0: t.text('deposited_jetton0').notNull(),
  depositedJetton1: t.text('deposited_jetton1').notNull(),
  withdrawnJetton0: t.text('withdrawn_jetton0').notNull(),
  withdrawnJetton1: t.text('withdrawn_jetton1').notNull(),
  collectedFeeJetton0: t.text('collected_fee_jetton0').notNull(),
  collectedFeeJetton1: t.text('collected_fee_jetton1').notNull(),
  feeGrowthInside0LastX128: t
    .bigint('fee_growth_inside_0_last_x128', {
      mode: 'bigint',
    })
    .notNull(),
  feeGrowthInside1LastX128: t
    .bigint('fee_growth_inside_1_last_x128', {
      mode: 'bigint',
    })
    .notNull(),
});

export const positionRelations = relations(position, ({ one, many }) => {
  return {
    pool: one(pool, {
      fields: [position.poolId],
      references: [pool.id],
    }),
    transaction: one(transaction, {
      fields: [position.transactionId],
      references: [transaction.id],
    }),
    jetton0: one(jetton, {
      fields: [position.jetton0Id],
      references: [jetton.id],
    }),
    jetton1: one(jetton, {
      fields: [position.jetton1Id],
      references: [jetton.id],
    }),
    positionData: many(positionData),
  };
});
