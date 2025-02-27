import { handleInitialize } from '../../src/mappings/core/initalize';
import { Database, DatabaseMode, db } from '../../src/db';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { Jetton, Pool, Router, Transaction } from '../../src/models';
import { getMockInitializeEvent } from './common';
import { encodePriceSqrt } from '../helper';

describe('Test Handle Initialize', () => {
  beforeEach(async () => {
    Database.init(DatabaseMode.IN_MEMORY);
    await migrate(db as any, {
      migrationsFolder: __dirname.split('/tests')[0] + '/drizzle',
    });
  });

  it('should handle initialize event when there is no pool yet', async () => {
    const event = getMockInitializeEvent();
    await handleInitialize(event).catch((err) => {
      // console.log(err);
      console.log(err.stack);
    });
    //@ts-ignore
    let router = (await db.query.router.findFirst({})) as Router;
    expect(router.poolCount).toEqual('1');
    //@ts-ignore
    let pool = (await db.query.pool.findFirst({})) as Pool;
    expect(pool.jetton0Id).toBeDefined;
    expect(pool.jetton1Id).toBeDefined;
    expect(pool.feeTier).toEqual(500n);
    expect(pool.feeProtocol).toEqual(222825800n);
    expect(pool.sqrtPrice).toEqual(encodePriceSqrt(1n, 1n).toString());
    expect(pool.tick).toEqual(0n);
    //@ts-ignore
    let transaction = (await db.query.transaction.findFirst({})) as Transaction;
    expect(transaction.hash).toEqual(event.transaction.hash);
    //@ts-ignore
    let jettons = (await db.query.jetton.findMany({})) as Jetton[];
    expect(jettons[0].name).toBe('Tether USD');
    expect(jettons[1].name).toBe('Hamster Kombat');
  }, 100000);
});
