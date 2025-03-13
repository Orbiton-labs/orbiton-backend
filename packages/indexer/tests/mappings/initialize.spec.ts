import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { handleInitialize } from '../../src/mappings/core/initalize';
import { Database, DatabaseMode, db } from '../../src/db';
import { Jetton, Pool, Router, Transaction } from '../../src/models';
import { getMockInitializeEvent } from './common';
import { encodePriceSqrt } from '../helper';
import * as schema from '../../src/models';
import { ONE_DAY_IN_MILLISECONDS } from '../../src/constants';
import './__mocks__';
//@ts-ignore
import { describe, it, expect, beforeEach } from 'bun:test';

describe('Test Handle Initialize', () => {
  beforeEach(async () => {
    Database.init(DatabaseMode.IN_MEMORY);
    await migrate(db as any, {
      migrationsFolder: __dirname.split('/tests')[0] + '/drizzle',
    });
  });

  it('should handle initialize event when there is no pool yet', async () => {
    const event = getMockInitializeEvent();
    await handleInitialize(event);
    //@ts-ignore
    let router = (await db.query.router.findFirst({})) as Router;
    expect(router.poolCount).toEqual('1');
    expect(router.tonPriceUSD).toEqual('2');
    //@ts-ignore
    let pool = (await db.query.pool.findFirst({})) as Pool;
    expect(pool.jetton0Id).toBeDefined;
    expect(pool.jetton1Id).toBeDefined;
    expect(pool.feeTier).toEqual(500n);
    expect(pool.feeProtocol).toEqual(222825800n);
    expect(pool.sqrtPrice).toEqual(encodePriceSqrt(1n, 1n).toString());
    expect(pool.tick).toEqual(0n);
    //@ts-ignore
    let timestamp = event.block.timestamp;
    let dayID = Math.floor(timestamp / ONE_DAY_IN_MILLISECONDS);
    let dayPoolID = event.transaction.hash.concat('-').concat(dayID.toString());
    let poolDayData = await db.query.poolData.findFirst({
      where: eq(schema.poolData.id, dayPoolID),
    });
    expect(poolDayData.liquidity).toEqual(pool.liquidity);
    expect(poolDayData.poolId).toEqual(pool.id);
    expect(poolDayData.sqrtPrice).toEqual(pool.sqrtPrice);
    expect(poolDayData.feeGrowthGlobal0X128).toEqual(pool.feeGrowthGlobal0X128);
    expect(poolDayData.feeGrowthGlobal1X128).toEqual(pool.feeGrowthGlobal1X128);
    expect(poolDayData.tick).toEqual(pool.tick);
    expect(poolDayData.tvlUSD).toEqual(pool.totalValueLockedUSD);
    expect(poolDayData.txCount).toEqual('1');
    //@ts-ignore
    let transaction = (await db.query.transaction.findFirst({})) as Transaction;
    expect(transaction.id).toEqual(event.transaction.hash);
    //@ts-ignore
    let jettons = (await db.query.jetton.findMany({})) as Jetton[];
    console.log(jettons);
    expect(jettons[0].name).toBe('Tether USD');
    expect(jettons[0].decimals).toBe(6);
    expect(jettons[0].derivedTon).toBe('0.5');
    expect(jettons[0].derivedUSD).toBe('1');
    expect(jettons[1].name).toBe('jUSDC');
    expect(jettons[1].decimals).toBe(6);
    expect(jettons[1].derivedTon).toBe('0.5');
    expect(jettons[1].derivedUSD).toBe('1');
  }, 100000);
});
