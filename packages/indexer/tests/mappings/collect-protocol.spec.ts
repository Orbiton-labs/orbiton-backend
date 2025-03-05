import { handleMint } from '../../src/mappings/core/mint';
import { Database, DatabaseMode, db } from '../../src/db';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { Collect, Jetton, Pool, Router } from '../../src/models';
import {
  getMockCollectProtocolEvent,
  getMockInitializeEvent,
  getMockMintEventInsideCurrentTick,
} from './common';
import { handleInitialize } from '../../src/mappings/core/initalize';
import { convertJettonToDecimal } from '../../src/mappings/utils/jetton';
import './__mocks__';
//@ts-ignore
import { describe, it, expect, beforeAll } from 'bun:test';
import { getAdjustedAmounts } from '../../src/mappings/utils/pricing';
import { handleCollectProtocol } from '../../src/mappings/core/collect-protocol';
import BigDecimal from 'js-big-decimal';

describe('Test Handle Collect Protocol', () => {
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

  it('should handle collect protocol event', async () => {
    const event = getMockCollectProtocolEvent();
    await handleCollectProtocol(event);

    //@ts-ignore
    let router = (await db.query.router.findFirst({})) as Router;
    //@ts-ignore
    let jettons = (await db.query.jetton.findMany({})) as Jetton[];
    //@ts-ignore
    let pool = (await db.query.pool.findFirst({})) as Pool;

    expect(jettons[0].totalValueLocked).toEqual(
      convertJettonToDecimal(16900000n, jettons[0]).stripTrailingZero().getValue(),
    );
    expect(jettons[0].totalValueLockedUSD).toEqual('16.9');
    expect(jettons[0].txCount).toEqual('2');
    expect(jettons[1].totalValueLocked).toEqual(
      convertJettonToDecimal(8800000n, jettons[1]).stripTrailingZero().getValue(),
    );
    expect(jettons[1].totalValueLockedUSD).toEqual('8.8');
    expect(jettons[1].txCount).toEqual('2');

    const amounts = getAdjustedAmounts(
      router,
      new BigDecimal(pool.totalValueLockedJetton0),
      jettons[0],
      new BigDecimal(pool.totalValueLockedJetton1),
      jettons[1],
    );
    expect(pool.totalValueLockedJetton0).toEqual(
      convertJettonToDecimal(16900000n, jettons[0]).stripTrailingZero().getValue(),
    );
    expect(pool.totalValueLockedJetton1).toEqual(
      convertJettonToDecimal(8800000n, jettons[1]).stripTrailingZero().getValue(),
    );
    expect(pool.totalValueLockedTon).toEqual(amounts.ton.stripTrailingZero().getValue());
    expect(pool.totalValueLockedUSD).toEqual(amounts.usd.stripTrailingZero().getValue());
    expect(pool.txCount).toEqual('2');

    expect(router.totalValueLockedTon).toEqual(amounts.ton.stripTrailingZero().getValue());
    expect(router.totalValueLockedUSD).toEqual(amounts.usd.stripTrailingZero().getValue());
    expect(router.txCount).toEqual('2');
  });
});
