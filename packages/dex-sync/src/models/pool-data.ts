import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';

export const poolData = table('pool_data', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  date: t.integer().notNull(),
  pool: t.text().notNull(),
  liquidity: t.text().notNull(),
  sqrtPrice: t.text('sqrt_price').notNull(),
  jetton0Price: t.text('jetton0_price').notNull(),
  jetton1Price: t.text('jetton1_price').notNull(),
  tick: t.integer().notNull(),
  feeGrowthGlobal0X128: t.text('fee_growth_global_0x128').notNull(),
  feeGrowthGlobal1X128: t.text('fee_growth_global_1x128').notNull(),
  tvlUSD: t.text('tvl_usd').notNull(),
  volumeJetton0: t.text('volume_jetton0').notNull(),
  volumeJetton1: t.text('volume_jetton1').notNull(),
  volumeUSD: t.text('volume_usd').notNull(),
  feesUSD: t.text('fees_usd').notNull(),
  protocolFeesUSD: t.text('protocol_fees_usd').notNull(),
  txCount: t.integer('tx_count').notNull(),
});
