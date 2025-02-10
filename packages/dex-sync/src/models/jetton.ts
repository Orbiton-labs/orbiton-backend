import { relations } from 'drizzle-orm';
import * as t from 'drizzle-orm/pg-core';
import { pgTable as table } from 'drizzle-orm/pg-core';
import { pool } from './pool';
import { jettonData } from './jetton-data';
import { position } from './position';
import { mint } from './mint';
import { swap } from './swap';
import { burn } from './burn';

export const jetton = table('jettons', {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  name: t.text().notNull(),
  symbol: t.text().notNull(),
  decimals: t.integer().notNull(),
  totalSupply: t
    .bigint('total_supply', {
      mode: 'bigint',
    })
    .notNull(),
  address: t.text().notNull(),
  poolCount: t
    .bigint('pool_count', {
      mode: 'bigint',
    })
    .notNull(),
  txCount: t
    .bigint('tx_count', {
      mode: 'bigint',
    })
    .notNull(),
  volume: t.text().notNull(),
  volumeUSD: t.text('volume_usd').notNull(),
  feesUSD: t.text('fees_usd').notNull(),
  protocolFeesUSD: t.text('protocol_fees_usd').notNull(),
  totalValueLocked: t.text('total_value_locked').notNull(),
  totalValueLockedUSD: t.text('total_value_locked_usd').notNull(),
  derivedTon: t.text('derived_ton').notNull(),
  derivedUSD: t.text('derived_usd').notNull(),
});

export const jettonRelations = relations(jetton, ({ many }) => {
  return {
    pools: many(pool),
    jettonData: many(jettonData),
    position: many(position),
    mint: many(mint),
    swap: many(swap),
    burn: many(burn),
  };
});
