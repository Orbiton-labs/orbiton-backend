import { handleMint } from '../../src/mappings/core/mint';
import { Database, DatabaseMode, db } from '../../src/db';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { Jetton, Pool, Router, Transaction } from '../../src/models';
import {
  getMockInitializeEvent,
  getMockMintEventInsideCurrentTick,
  getMockMintEventOutsideCurrentTick,
} from './common';
import { handleInitialize } from '../../src/mappings/core/initalize';
import { convertJettonToDecimal } from '../../src/mappings/utils/jetton';
import * as schema from '../../src/models';
import { ONE_DAY_IN_MILLISECONDS } from '../../src/constants';
import { eq } from 'drizzle-orm';
import BigDecimal from 'decimal.js';
import './__mocks__';
//@ts-ignore
import { describe, it, expect, beforeAll } from 'bun:test';
import { bigDecimalExponated } from '../../src/mappings/utils';
import { BigDecimalConfig } from '../../src/mappings/constant';

BigDecimal.set(BigDecimalConfig);
describe('Test Handle Mint', () => {
  beforeAll(async () => {
    Database.init(DatabaseMode.IN_MEMORY);
    await migrate(db as any, {
      migrationsFolder: __dirname.split('/tests')[0] + '/drizzle',
    });
    const event = getMockInitializeEvent();
    await handleInitialize(event);
  });

  it('#1 should handle mint event when it adds liquidity inside current tick', async () => {
    const event = getMockMintEventInsideCurrentTick();
    await handleMint(event);

    //@ts-ignore
    let router = (await db.query.router.findFirst({})) as Router;
    expect(router.txCount).toEqual('1');

    //@ts-ignore
    let jettons = (await db.query.jetton.findMany({})) as Jetton[];
    expect(jettons.length).toEqual(2);
    expect(jettons[0].totalValueLocked).toEqual(
      convertJettonToDecimal(17000000n, jettons[0]).toString(),
    );
    expect(jettons[0].totalValueLockedUSD).toEqual(
      convertJettonToDecimal(17000000n, jettons[0])
        .mul(new BigDecimal(jettons[0].derivedTon))
        .mul(new BigDecimal(router.tonPriceUSD))

        .toString(),
    );
    expect(jettons[0].totalValueLockedUSD).not.toEqual('0');
    expect(jettons[0].txCount).toEqual('1');
    expect(jettons[1].totalValueLocked).toEqual(
      convertJettonToDecimal(9000000n, jettons[1]).toString(),
    );
    expect(jettons[1].totalValueLockedUSD).toEqual(
      convertJettonToDecimal(9000000n, jettons[1])
        .mul(new BigDecimal(jettons[1].derivedTon))
        .mul(new BigDecimal(router.tonPriceUSD))

        .toString(),
    );
    expect(jettons[1].totalValueLockedUSD).not.toEqual('0');
    expect(jettons[1].txCount).toEqual('1');

    //@ts-ignore
    let pool = (await db.query.pool.findFirst({})) as Pool;
    expect(pool.totalValueLockedJetton0).toEqual(
      convertJettonToDecimal(17000000n, jettons[0]).toString(),
    );
    expect(pool.totalValueLockedJetton1).toEqual(
      convertJettonToDecimal(9000000n, jettons[1]).toString(),
    );
    expect(pool.txCount).toEqual('1');
    expect(pool.liquidity).toEqual('15000000');
    expect(pool.liquidityProviderCount).toEqual('1');
    // Note: Mint Event does not update jetton0 and jetton1 price until it reachs swap function
    expect(pool.jetton0Price).toEqual('0');
    expect(pool.jetton1Price).toEqual('0');
    expect(pool.totalValueLockedTon).toEqual(
      new BigDecimal(pool.totalValueLockedJetton0)
        .mul(new BigDecimal(jettons[0].derivedTon))
        .add(
          new BigDecimal(pool.totalValueLockedJetton1).mul(new BigDecimal(jettons[1].derivedTon)),
        )

        .toString(),
    );
    expect(pool.totalValueLockedUSD).toEqual(
      new BigDecimal(pool.totalValueLockedTon)
        .mul(new BigDecimal(2))

        .toString(),
    );
    expect(pool.totalValueLockedTon).not.toEqual('0');
    expect(pool.totalValueLockedUSD).not.toEqual('0');
    expect(router.totalValueLockedTon).toEqual(pool.totalValueLockedTon);
    expect(router.totalValueLockedUSD).toEqual(pool.totalValueLockedUSD);

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
    expect(ticks[0].feeGrowthOutside0X128).toEqual('10000');
    expect(ticks[0].feeGrowthOutside1X128).toEqual('20000');

    expect(ticks[1].liquidityGross).toEqual('15000000');
    expect(ticks[1].liquidityNet).toEqual('-15000000');
    expect(ticks[1].price0).not.toEqual('0');
    expect(ticks[1].price1).not.toEqual('0');
    expect(ticks[1].poolAddress).toEqual(event.address.toString());
    expect(ticks[0].feeGrowthOutside0X128).toEqual('10000');
    expect(ticks[0].feeGrowthOutside1X128).toEqual('20000');

    //@ts-ignore
    let routerData = (await db.query.routerData.findFirst({})) as schema.RouterData;
    expect(routerData.txCount).toEqual('1');
    expect(routerData.tvlUSD).toEqual(router.totalValueLockedUSD);

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
    let jetton0DayID = jettons[0].id.toString().concat('-').concat(dayID.toString());
    let jetton0DayData = await db.query.jettonData.findFirst({
      where: eq(schema.jettonData.id, jetton0DayID),
    });
    expect(jetton0DayData.priceUSD).toEqual(
      new BigDecimal(jettons[0].derivedTon)
        .mul(new BigDecimal(router.tonPriceUSD))

        .toString(),
    );
    expect(jetton0DayData.totalValueLocked).toEqual(jettons[0].totalValueLocked);
    expect(jetton0DayData.totalValueLockedUSD).toEqual(jettons[0].totalValueLockedUSD);

    let jetton1DayID = jettons[1].id.toString().concat('-').concat(dayID.toString());
    let jetton1DayData = await db.query.jettonData.findFirst({
      where: eq(schema.jettonData.id, jetton1DayID),
    });
    expect(jetton1DayData.priceUSD).toEqual(
      new BigDecimal(jettons[1].derivedTon)
        .mul(new BigDecimal(router.tonPriceUSD))

        .toString(),
    );
    expect(jetton1DayData.totalValueLocked).toEqual(jettons[1].totalValueLocked);
    expect(jetton1DayData.totalValueLockedUSD).toEqual(jettons[1].totalValueLockedUSD);
  }, 100000);

  it('#2 should handle mint event when it adds liquidity outside current tick right after #1', async () => {
    const event = getMockMintEventOutsideCurrentTick();
    //@ts-ignore
    await handleMint(event);

    //@ts-ignore
    let router = (await db.query.router.findFirst({})) as Router;
    expect(router.txCount).toEqual('2');

    //@ts-ignore
    let jettons = (await db.query.jetton.findMany({})) as Jetton[];
    expect(jettons.length).toEqual(2);
    expect(jettons[0].totalValueLocked).toEqual(
      convertJettonToDecimal(20000000n, jettons[0]).toString(),
    );
    expect(jettons[0].totalValueLockedUSD).not.toEqual('0');
    expect(jettons[0].txCount).toEqual('2');
    expect(jettons[0].totalValueLockedUSD).toEqual(
      convertJettonToDecimal(20000000n, jettons[0])
        .mul(new BigDecimal(jettons[0].derivedTon))
        .mul(new BigDecimal(router.tonPriceUSD))

        .toString(),
    );
    expect(jettons[1].totalValueLocked).toEqual(
      convertJettonToDecimal(59000000n, jettons[1]).toString(),
    );
    expect(jettons[1].totalValueLockedUSD).not.toEqual('0');
    expect(jettons[1].txCount).toEqual('2');
    expect(jettons[1].totalValueLockedUSD).toEqual(
      convertJettonToDecimal(59000000n, jettons[1])
        .mul(new BigDecimal(jettons[1].derivedTon))
        .mul(new BigDecimal(router.tonPriceUSD))

        .toString(),
    );

    //@ts-ignore
    let pool = (await db.query.pool.findFirst({})) as Pool;
    expect(pool.totalValueLockedJetton0).toEqual(
      convertJettonToDecimal(20000000n, jettons[0]).toString(),
    );
    expect(pool.totalValueLockedJetton1).toEqual(
      convertJettonToDecimal(59000000n, jettons[1]).toString(),
    );
    // this will not change because outside of current tick
    expect(pool.liquidity).toEqual('15000000');
    expect(pool.txCount).toEqual('2');
    expect(pool.totalValueLockedTon).toEqual(
      new BigDecimal(pool.totalValueLockedJetton0)
        .mul(new BigDecimal(jettons[0].derivedTon))
        .add(
          new BigDecimal(pool.totalValueLockedJetton1).mul(new BigDecimal(jettons[1].derivedTon)),
        )

        .toString(),
    );
    expect(pool.totalValueLockedUSD).toEqual(
      new BigDecimal(pool.totalValueLockedTon)
        .mul(new BigDecimal(2))

        .toString(),
    );
    expect(pool.totalValueLockedTon).not.toEqual('0');
    expect(pool.totalValueLockedUSD).not.toEqual('0');
    expect(router.totalValueLockedTon).toEqual(pool.totalValueLockedTon);
    expect(router.totalValueLockedUSD).toEqual(pool.totalValueLockedUSD);
    expect(pool.liquidityProviderCount).toEqual('2');

    //@ts-ignore
    let mints = (await db.query.mint.findMany({})) as schema.Mint[];
    let mint = mints[1];
    expect(mint.amount).toEqual('14000000');
    expect(mint.amount0).toEqual('3000000');
    expect(mint.amount1).toEqual('50000000');
    expect(mint.amountUSD).toEqual(
      convertJettonToDecimal(3000000n, jettons[0])
        .mul(new BigDecimal(jettons[0].derivedTon))
        .mul(new BigDecimal(router.tonPriceUSD))
        .add(
          convertJettonToDecimal(50000000n, jettons[1])
            .mul(new BigDecimal(jettons[1].derivedTon))
            .mul(new BigDecimal(router.tonPriceUSD)),
        )
        .toString(),
    );
    expect(mint.poolId).toEqual(pool.id);
    expect(mint.sender).toEqual(event.sender.toString());
    expect(mint.owner).toEqual(event.owner.toString());
    expect(mint.tickLower).toEqual(event.tickLower);
    expect(mint.tickUpper).toEqual(event.tickUpper);

    //@ts-ignore
    let ticks = (await db.query.tick.findMany({})) as schema.Tick[];
    expect(ticks.length).toEqual(3);
    expect(ticks[1].liquidityGross).toEqual('14000000');
    expect(ticks[1].liquidityNet).toEqual('14000000');
    expect(ticks[1].price0).toEqual(bigDecimalExponated(new BigDecimal('1.0001'), 1n).toString());
    expect(ticks[1].price1).toEqual(
      new BigDecimal('1')
        .div(bigDecimalExponated(new BigDecimal('1.0001'), 1n))

        .toString(),
    );
    expect(ticks[1].poolAddress).toEqual(event.address.toString());

    // this will be accumulated results since colliding tick index
    expect(ticks[2].liquidityGross).toEqual('29000000');
    expect(ticks[2].liquidityNet).toEqual('-29000000');
    expect(ticks[2].price0).toEqual(bigDecimalExponated(new BigDecimal('1.0001'), 10n).toString());
    expect(ticks[2].price1).toEqual(
      new BigDecimal('1')
        .div(bigDecimalExponated(new BigDecimal('1.0001'), 10n))

        .toString(),
    );
    expect(ticks[2].poolAddress).toEqual(event.address.toString());

    //@ts-ignore
    let routerData = (await db.query.routerData.findFirst({})) as schema.RouterData;
    expect(routerData.txCount).toEqual('2');
    expect(routerData.tvlUSD).toEqual(router.totalValueLockedUSD);

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
    let jetton0DayID = jettons[0].id.toString().concat('-').concat(dayID.toString());
    let jetton0DayData = await db.query.jettonData.findFirst({
      where: eq(schema.jettonData.id, jetton0DayID),
    });
    expect(jetton0DayData.priceUSD).toEqual(
      new BigDecimal(jettons[0].derivedTon)
        .mul(new BigDecimal(router.tonPriceUSD))

        .toString(),
    );
    expect(jetton0DayData.totalValueLocked).toEqual(jettons[0].totalValueLocked);
    expect(jetton0DayData.totalValueLockedUSD).toEqual(jettons[0].totalValueLockedUSD);

    let jetton1DayID = jettons[1].id.toString().concat('-').concat(dayID.toString());
    let jetton1DayData = await db.query.jettonData.findFirst({
      where: eq(schema.jettonData.id, jetton1DayID),
    });
    expect(jetton1DayData.priceUSD).toEqual(
      new BigDecimal(jettons[1].derivedTon)
        .mul(new BigDecimal(router.tonPriceUSD))

        .toString(),
    );
    expect(jetton1DayData.totalValueLocked).toEqual(jettons[1].totalValueLocked);
    expect(jetton1DayData.totalValueLockedUSD).toEqual(jettons[1].totalValueLockedUSD);
  });
});
