import { handleMint } from '../../src/mappings/core/mint';
import { Database, DatabaseMode, db } from '../../src/db';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { Jetton, Pool, Router, Transaction, Burn } from '../../src/models';
import {
  getMockBurnEvent,
  getMockInitializeEvent,
  getMockMintEventInsideCurrentTick,
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
import { handleBurn } from '../../src/mappings/core/burn';
import { BigDecimalConfig } from '../../src/mappings/constant';

BigDecimal.set(BigDecimalConfig);
describe('Test Handle Burn', () => {
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

  it('should handle burn event', async () => {
    const event = getMockBurnEvent();
    await handleBurn(event);

    //@ts-ignore
    let router = (await db.query.router.findFirst({})) as Router;

    //@ts-ignore
    let jettons = (await db.query.jetton.findMany({})) as Jetton[];
    expect(jettons.length).toEqual(2);
    expect(jettons[0].totalValueLocked).toEqual(
      convertJettonToDecimal(10000000n, jettons[0]).toString(),
    );
    expect(jettons[0].totalValueLockedUSD).toEqual(
      convertJettonToDecimal(10000000n, jettons[0])
        .mul(new BigDecimal(jettons[0].derivedTon))
        .mul(new BigDecimal(router.tonPriceUSD))

        .toString(),
    );
    expect(jettons[0].totalValueLockedUSD).not.toEqual('0');
    expect(jettons[0].txCount).toEqual('2');
    expect(jettons[1].totalValueLocked).toEqual(
      convertJettonToDecimal(6000000n, jettons[1]).toString(),
    );
    expect(jettons[1].totalValueLockedUSD).toEqual(
      convertJettonToDecimal(6000000n, jettons[1])
        .mul(new BigDecimal(jettons[1].derivedTon))
        .mul(new BigDecimal(router.tonPriceUSD))

        .toString(),
    );
    expect(jettons[1].totalValueLockedUSD).not.toEqual('0');
    expect(jettons[1].txCount).toEqual('2');

    //@ts-ignore
    let pool = (await db.query.pool.findFirst({})) as Pool;
    expect(pool.totalValueLockedJetton0).toEqual(
      convertJettonToDecimal(10000000n, jettons[0]).toString(),
    );
    expect(pool.totalValueLockedJetton1).toEqual(
      convertJettonToDecimal(6000000n, jettons[1]).toString(),
    );
    expect(pool.txCount).toEqual('2');
    expect(pool.liquidity).toEqual('10000000');
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
    let transaction = (await db.query.transaction.findFirst({
      where: eq(schema.transaction.id, event.transaction.hash),
    })) as Transaction;
    //@ts-ignore
    let burn = (await db.query.burn.findFirst({})) as Burn;
    expect(burn.transactionId).toEqual(transaction.id);
    expect(burn.timestamp).toEqual(transaction.timestamp);
    expect(burn.poolId).toEqual(pool.id);
    expect(burn.jetton0Id).toEqual(jettons[0].id);
    expect(burn.jetton1Id).toEqual(jettons[1].id);
    expect(burn.amount0).toEqual(event.amount0.toString());
    expect(burn.amount1).toEqual(event.amount1.toString());
    expect(burn.amountUSD).toEqual(
      convertJettonToDecimal(event.amount0, jettons[0])
        .mul(new BigDecimal(jettons[0].derivedTon).mul(new BigDecimal(router.tonPriceUSD)))
        .add(
          convertJettonToDecimal(event.amount1, jettons[1]).mul(
            new BigDecimal(jettons[1].derivedTon).mul(new BigDecimal(router.tonPriceUSD)),
          ),
        )

        .toString(),
    );
    expect(burn.amount).toEqual(event.amount.toString());
    expect(burn.tickLower).toEqual(BigInt(event.tickLower.toString()));
    expect(burn.tickUpper).toEqual(BigInt(event.tickUpper.toString()));
    expect(burn.owner).toEqual(event.owner.toString());
    expect(burn.origin).toEqual(event.transaction.from.toString());

    //@ts-ignore
    let ticks = (await db.query.tick.findMany({})) as schema.Tick[];
    expect(ticks.length).toEqual(2);
    expect(ticks[0].liquidityGross).toEqual('10000000');
    expect(ticks[0].liquidityNet).toEqual('10000000');
    expect(ticks[0].price0).toEqual(bigDecimalExponated(new BigDecimal('1.0001'), -10n).toString());
    expect(ticks[0].price1).toEqual(
      new BigDecimal('1')
        .div(bigDecimalExponated(new BigDecimal('1.0001'), -10n))

        .toString(),
    );
    expect(ticks[0].poolAddress).toEqual(event.transaction.from.toString());
    expect(ticks[0].feeGrowthOutside0X128).toEqual('10000');
    expect(ticks[0].feeGrowthOutside1X128).toEqual('20000');

    // this will be accumulated results since colliding tick index
    expect(ticks[1].liquidityGross).toEqual('10000000');
    expect(ticks[1].liquidityNet).toEqual('-10000000');
    expect(ticks[1].price0).toEqual(bigDecimalExponated(new BigDecimal('1.0001'), 10n).toString());
    expect(ticks[1].price1).toEqual(
      new BigDecimal('1')
        .div(bigDecimalExponated(new BigDecimal('1.0001'), 10n))

        .toString(),
    );
    expect(ticks[1].poolAddress).toEqual(event.transaction.from.toString());
    expect(ticks[1].feeGrowthOutside0X128).toEqual('10000');
    expect(ticks[1].feeGrowthOutside1X128).toEqual('20000');

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

    const positionAddress = event.address;
    const position = await db.query.position.findFirst({
      where: eq(schema.position.id, positionAddress.toString()),
    });
    expect(position.depositedJetton0).toEqual(
      convertJettonToDecimal(10000000n, jettons[0]).toString(),
    );
    expect(position.depositedJetton1).toEqual(
      convertJettonToDecimal(6000000n, jettons[1]).toString(),
    );
    expect(position.withdrawnJetton0).toEqual(
      convertJettonToDecimal(7000000n, jettons[0]).toString(),
    );
    expect(position.withdrawnJetton1).toEqual(
      convertJettonToDecimal(3000000n, jettons[0]).toString(),
    );
    expect(position.collectedFeeJetton0).toEqual('0');
    expect(position.collectedFeeJetton1).toEqual('0');
    expect(position.feeGrowthInside0LastX128).toEqual('500000');
    expect(position.feeGrowthInside1LastX128).toEqual('1500000');
    expect(position.liquidity).toEqual((BigInt(15000000) - BigInt(event.amount)).toString());
  });
});
