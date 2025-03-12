import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';
import { pool } from './pool';
import { position } from './position';
import { InferSelectModel } from 'drizzle-orm';

export const positionData = table('position_data', {
  id: t.text().primaryKey().notNull(),
  owner: t.text().notNull(),
  poolId: t
    .text('pool_id')
    .references(() => pool.id)
    .notNull(),
  positionId: t
    .text('position_id')
    .references(() => position.id)
    .notNull(),
  block: t.json().notNull(),
  timestamp: t.timestamp().notNull(),
  liquidity: t.text().notNull(),
  depositedJetton0: t.text('deposited_jetton0').notNull(),
  depositedJetton1: t.text('deposited_jetton1').notNull(),
  withdrawnJetton0: t.text('withdrawn_jetton0').notNull(),
  withdrawnJetton1: t.text('withdrawn_jetton1').notNull(),
  collectedFeeJetton0: t.text('collected_fee_jetton0').notNull(),
  collectedFeeJetton1: t.text('collected_fee_jetton1').notNull(),
  feeGrowthInside0LastX128: t.text('fee_growth_inside_0_last_x128').notNull(),
  feeGrowthInside1LastX128: t.text('fee_growth_inside_1_last_x128').notNull(),
});

export type PositionData = InferSelectModel<typeof positionData>;
