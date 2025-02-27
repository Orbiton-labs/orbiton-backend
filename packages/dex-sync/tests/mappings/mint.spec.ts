import { handleMint } from '../../src/mappings/core/mint';
import { Database, DatabaseMode, db } from '../../src/db';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { Jetton, Pool, Router, Transaction } from '../../src/models';
import { getMockInitializeEvent, getMockMintEventInsideCurrentTick } from './common';
import { handleInitialize } from '../../src/mappings/core/initalize';
import { convertJettonToDecimal } from '../../src/mappings/utils/jetton';
import * as schema from '../../src/models';

describe('Test Handle Mint', () => {
  beforeEach(async () => {
    Database.init(DatabaseMode.IN_MEMORY);
    await migrate(db as any, {
      migrationsFolder: __dirname.split('/tests')[0] + '/drizzle',
    });
    const event = getMockInitializeEvent();
    await handleInitialize(event);
  });

  it('should handle mint event when it adds liquidity inside current tick', async () => {
    const event = getMockMintEventInsideCurrentTick();
    await handleMint(event).catch((err) => {
      // console.log(err);
      console.log(err.stack);
    });

    //@ts-ignore
    let router = (await db.query.router.findFirst({})) as Router;
    expect(router.txCount).toEqual('1');

    //@ts-ignore
    let jettons = (await db.query.jetton.findMany({})) as Jetton[];
    expect(jettons.length).toEqual(2);
    expect(jettons[0].totalValueLocked).toEqual(
      convertJettonToDecimal(17000000n, jettons[0]).getValue(),
    );
    expect(jettons[0].totalValueLockedUSD).not.toEqual('0');
    expect(jettons[0].txCount).toEqual('1');
    expect(jettons[1].totalValueLocked).toEqual(
      convertJettonToDecimal(9000000n, jettons[1]).getValue(),
    );
    expect(jettons[1].totalValueLockedUSD).not.toEqual('0');
    expect(jettons[1].txCount).toEqual('1');

    //@ts-ignore
    let pool = (await db.query.pool.findFirst({})) as Pool;
    expect(pool.totalValueLockedJetton0).toEqual(
      convertJettonToDecimal(17000000n, jettons[0]).getValue(),
    );
    expect(pool.totalValueLockedJetton1).toEqual(
      convertJettonToDecimal(9000000n, jettons[1]).getValue(),
    );
    expect(pool.totalValueLockedTon).not.toEqual('0');
    expect(pool.totalValueLockedUSD).not.toEqual('0');
    expect(pool.txCount).toEqual('1');
    expect(pool.liquidity).toEqual('15000000');
    expect(pool.liquidityProviderCount).toEqual('1');

    //@ts-ignore
    let txs = (await db.query.transaction.findMany({})) as Transaction[];
    expect(txs.filter((tx) => tx.hash === event.transaction.hash).length).toEqual(1);

    //@ts-ignore
    let mint = (await db.query.mint.findFirst({})) as schema.Mint;
    expect(mint.amount).toEqual('15000000');
    expect(mint.amount0).toEqual('17000000');
    expect(mint.amount1).toEqual('9000000');
    expect(mint.amountUSD).not.toEqual('0');
    expect(mint.poolId).toEqual(pool.id);
    expect(mint.sender).toEqual(event.sender.toString());
    expect(mint.owner).toEqual(event.owner.toString());
    expect(mint.tickLower).toEqual(event.tickLower);
    expect(mint.tickUpper).toEqual(event.tickUpper);

    //@ts-ignore
    let ticks = (await db.query.tick.findMany({})) as schema.Tick[];
    expect(ticks.length).toEqual(2);
    expect(ticks[0].liquidityGross).toEqual('15000000');
    expect(ticks[0].liquidityNet).toEqual('15000000');
    expect(ticks[0].price0).not.toEqual('0');
    expect(ticks[0].price1).not.toEqual('0');
    expect(ticks[0].poolAddress).toEqual(event.address.toString());

    expect(ticks[1].liquidityGross).toEqual('15000000');
    expect(ticks[1].liquidityNet).toEqual('-15000000');
    expect(ticks[1].price0).not.toEqual('0');
    expect(ticks[1].price1).not.toEqual('0');
    expect(ticks[1].poolAddress).toEqual(event.address.toString());

    //@ts-ignore
    let routerData = (await db.query.routerData.findFirst({})) as schema.RouterData;
    expect(routerData.txCount).toEqual('1');
    expect(routerData.tvlUSD).toEqual(router.totalValueLockedUSD);

    //@ts-ignore
    let poolDayData = (await db.query.poolData.findFirst({})) as schema.PoolDayData;
    console.log({
      poolDayData,
      pool,
    });
  }, 100000);
});
