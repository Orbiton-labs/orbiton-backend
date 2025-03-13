import { handleMint } from '../../src/mappings/core/mint';
import { Database, DatabaseMode, db } from '../../src/db';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { Collect, Jetton, Pool, Router, Position } from '../../src/models';
import {
  getMockCollectEvent,
  getMockInitializeEvent,
  getMockMintEventInsideCurrentTick,
} from './common';
import { handleInitialize } from '../../src/mappings/core/initalize';
import { convertJettonToDecimal } from '../../src/mappings/utils/jetton';
import './__mocks__';
//@ts-ignore
import { describe, it, expect, beforeAll } from 'bun:test';
import { handleCollect } from '../../src/mappings/core/collect';
import { getAdjustedAmounts } from '../../src/mappings/utils/pricing';

describe('Test Handle Collect', () => {
  beforeAll(async () => {
    Database.init(DatabaseMode.IN_MEMORY);
    await migrate(db as any, {
      migrationsFolder: __dirname.split('/tests')[0] + '/drizzle',
    });
    const initializeEvent = getMockInitializeEvent();
    await handleInitialize(initializeEvent);
    const mintEvent = getMockMintEventInsideCurrentTick();
    await handleMint(mintEvent);
  });

  it('should handle collect event', async () => {
    const event = getMockCollectEvent();
    await handleCollect(event);

    //@ts-ignore
    let router = (await db.query.router.findFirst({})) as Router;
    //@ts-ignore
    let jettons = (await db.query.jetton.findMany({})) as Jetton[];
    //@ts-ignore
    let pool = (await db.query.pool.findFirst({})) as Pool;

    let amount0 = convertJettonToDecimal(event.amount0, jettons[0]);
    let amount1 = convertJettonToDecimal(event.amount1, jettons[1]);
    let amounts = getAdjustedAmounts(router, amount0, jettons[0], amount1, jettons[1]);

    expect(pool.collectedFeesJetton0).toEqual(amount0.toString());
    expect(pool.collectedFeesJetton1).toEqual(amount1.toString());
    expect(pool.collectedFeesUSD).toEqual(amounts.usd.toString());
    expect(router.txCount).toEqual('2');
    expect(jettons[0].txCount).toEqual('2');
    expect(jettons[1].txCount).toEqual('2');
    expect(pool.txCount).toEqual('2');

    //@ts-ignore
    let collect = (await db.query.collect.findFirst({})) as Collect;
    expect(collect.amount0).toEqual(amount0.toString());
    expect(collect.amount1).toEqual(amount1.toString());
    expect(collect.poolId).toEqual(pool.id);
    expect(collect.transactionId).toBeDefined();
    expect(collect.amountUSD).toEqual(amounts.usd.toString());
    expect(collect.tickLower).toEqual(event.tickLower);
    expect(collect.tickUpper).toEqual(event.tickUpper);

    //@ts-ignore
    let position = (await db.query.position.findFirst({})) as Position;
    expect(position.collectedFeeJetton0).toEqual(amount0.toString());
    expect(position.collectedFeeJetton1).toEqual(amount1.toString());
  });
});
