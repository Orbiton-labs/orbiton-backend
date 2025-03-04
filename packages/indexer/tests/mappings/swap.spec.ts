import { handleMint } from '../../src/mappings/core/mint';
import { Database, DatabaseMode, db } from '../../src/db';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { Jetton, Pool, Router, Swap, PoolData, RouterData, jettonData } from '../../src/models';
import {
  getMockInitializeEvent,
  getMockMintEventInsideCurrentTick,
  getMockSwapEvent,
  getSecondMockSwapEvent,
} from './common';
import { handleInitialize } from '../../src/mappings/core/initalize';
import { convertJettonToDecimal } from '../../src/mappings/utils/jetton';
import * as schema from '../../src/models';
import { ONE_DAY_IN_MILLISECONDS, TWO_BD } from '../../src/constants';
import { eq } from 'drizzle-orm';
import BigDecimal from 'js-big-decimal';
import './__mocks__';
//@ts-ignore
import { describe, it, expect, beforeAll } from 'bun:test';
import { handleSwap } from '../../src/mappings/core/swap';
import { sqrtPriceX96ToJettonPrices } from '../../src/mappings/utils/pricing';

describe('Test Handle Swap', () => {
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

  it('should handle swap event', async () => {
    //@ts-ignore
    let _prePool = (await db.query.pool.findFirst({})) as Pool;

    const event = getMockSwapEvent();
    await handleSwap(event);

    //@ts-ignore
    let router = (await db.query.router.findFirst({})) as Router;
    //@ts-ignore
    let jettons = (await db.query.jetton.findMany({})) as Jetton[];
    //@ts-ignore
    let pool = (await db.query.pool.findFirst({})) as Pool;
    expect(router.txCount).toEqual('2');
    expect(router.poolCount).toEqual('1');
    let amount0 = convertJettonToDecimal(event.amount0, jettons[0]);
    let amount1 = convertJettonToDecimal(event.amount1, jettons[1]);
    let amount0Abs = amount0.compareTo(new BigDecimal('0')) === -1 ? amount0.negate() : amount0;
    let amount1Abs = amount1.compareTo(new BigDecimal('0')) === -1 ? amount1.negate() : amount1;
    let ton = amount0Abs
      .multiply(new BigDecimal(jettons[0].derivedTon))
      .add(amount1Abs.multiply(new BigDecimal(jettons[1].derivedTon)));
    const usd = ton.multiply(new BigDecimal(router.tonPriceUSD));
    const volumeTon = ton.divide(new BigDecimal(TWO_BD));
    const volumeUSD = usd.divide(new BigDecimal(TWO_BD));
    expect(router.totalVolumeTon).toEqual(volumeTon.stripTrailingZero().getValue());
    expect(router.totalVolumeUSD).toEqual(volumeUSD.stripTrailingZero().getValue());
    let protocolAmount0 = convertJettonToDecimal(event.protocolFeesJetton0, jettons[0]);
    let protocolAmount1 = convertJettonToDecimal(event.protocolFeesJetton1, jettons[1]);
    let protocolTon = protocolAmount0
      .multiply(new BigDecimal(jettons[0].derivedTon))
      .add(protocolAmount1.multiply(new BigDecimal(jettons[1].derivedTon)));
    const protocolUSD = protocolTon.multiply(new BigDecimal(router.tonPriceUSD));
    let feesTon = ton
      .divide(new BigDecimal(TWO_BD))
      .multiply(new BigDecimal(pool.feeTier))
      .divide(new BigDecimal('1000000'));
    const feesUSD = usd
      .divide(new BigDecimal(TWO_BD))
      .multiply(new BigDecimal(pool.feeTier))
      .divide(new BigDecimal('1000000'));
    const feesProtocolTon = protocolTon;
    const feesProtocolUSD = protocolUSD;
    expect(router.totalFeesTon).toEqual(feesTon.stripTrailingZero().getValue());
    expect(router.totalFeesUSD).toEqual(feesUSD.stripTrailingZero().getValue());
    expect(router.totalProtocolFeesTon).toEqual(feesProtocolTon.stripTrailingZero().getValue());
    expect(router.totalProtocolFeesUSD).toEqual(feesProtocolUSD.stripTrailingZero().getValue());
    expect(router.tonPriceUSD).toEqual('2');

    // pool checker
    expect(pool.volumeJetton0).toEqual(
      new BigDecimal(_prePool.volumeJetton0).add(amount0Abs).stripTrailingZero().getValue(),
    );
    expect(pool.volumeJetton1).toEqual(
      new BigDecimal(_prePool.volumeJetton1).add(amount1Abs).stripTrailingZero().getValue(),
    );
    expect(pool.volumeUSD).toEqual(
      new BigDecimal(_prePool.volumeUSD).add(volumeUSD).stripTrailingZero().getValue(),
    );
    expect(pool.feesUSD).toEqual(
      new BigDecimal(_prePool.feesUSD).add(feesUSD).stripTrailingZero().getValue(),
    );
    expect(pool.protocolFeesUSD).toEqual(
      new BigDecimal(_prePool.protocolFeesUSD).add(feesProtocolUSD).stripTrailingZero().getValue(),
    );
    expect(pool.txCount).toEqual((BigInt(_prePool.txCount) + 1n).toString());
    expect(pool.tick).toEqual(BigInt(event.tick));
    expect(pool.liquidity).toEqual(event.liquidity.toString());
    expect(pool.sqrtPrice).toEqual(event.sqrtPriceX96.toString());
    let prices = sqrtPriceX96ToJettonPrices(event.sqrtPriceX96, jettons[0], jettons[1]);
    expect(pool.jetton0Price).toEqual(prices[0].stripTrailingZero().getValue());
    expect(pool.jetton1Price).toEqual(prices[1].stripTrailingZero().getValue());
    expect(pool.totalValueLockedJetton0).toEqual(
      new BigDecimal(_prePool.totalValueLockedJetton0).add(amount0).stripTrailingZero().getValue(),
    );
    expect(pool.totalValueLockedJetton1).toEqual(
      new BigDecimal(_prePool.totalValueLockedJetton1).add(amount1).stripTrailingZero().getValue(),
    );

    // jetton checker
    expect(jettons[0].volume).toEqual(amount0Abs.stripTrailingZero().getValue());
    expect(jettons[0].feesUSD).toEqual(feesUSD.stripTrailingZero().getValue());
    expect(jettons[0].protocolFeesUSD).toEqual(feesProtocolUSD.stripTrailingZero().getValue());
    expect(jettons[0].volumeUSD).toEqual(volumeUSD.stripTrailingZero().getValue());
    expect(jettons[0].txCount).toEqual('2');
    expect(jettons[0].derivedUSD).toEqual('1');
    expect(jettons[0].totalValueLocked).toEqual('16.5');

    expect(jettons[1].volume).toEqual(amount1Abs.stripTrailingZero().getValue());
    expect(jettons[1].feesUSD).toEqual(feesUSD.stripTrailingZero().getValue());
    expect(jettons[1].protocolFeesUSD).toEqual(feesProtocolUSD.stripTrailingZero().getValue());
    expect(jettons[1].volumeUSD).toEqual(volumeUSD.stripTrailingZero().getValue());
    expect(jettons[1].txCount).toEqual('2');
    expect(jettons[1].derivedUSD).toEqual('1');
    expect(jettons[1].totalValueLocked).toEqual('9.499999');

    // swap check
    //@ts-ignore
    let swap = (await db.query.swap.findFirst({})) as Swap;
    expect(swap.amount0).toEqual(amount0.stripTrailingZero().getValue());
    expect(swap.amount1).toEqual(amount1.stripTrailingZero().getValue());
    expect(swap.amountUSD).toEqual(volumeUSD.stripTrailingZero().getValue());
    expect(swap.poolId).toEqual(pool.id);
    expect(swap.sqrtPriceX96).toEqual(event.sqrtPriceX96.toString());
    expect(swap.tick).toEqual(event.tick);
    expect(swap.amountFeeUSD).toEqual(protocolUSD.stripTrailingZero().getValue());

    let dayID = Math.floor(event.block.timestamp / ONE_DAY_IN_MILLISECONDS); // rounded
    //@ts-ignore
    let routerData = (await db.query.routerData.findFirst({
      where: eq(schema.routerData.id, dayID.toString()),
    })) as RouterData;
    expect(routerData.volumeUSD).toEqual(volumeUSD.stripTrailingZero().getValue());
    expect(routerData.volumeTon).toEqual(volumeTon.stripTrailingZero().getValue());
    expect(routerData.txCount).toEqual('2');
    expect(routerData.protocolFeesUSD).toEqual(feesProtocolUSD.stripTrailingZero().getValue());
    expect(routerData.feesUSD).toEqual(feesUSD.stripTrailingZero().getValue());

    //@ts-ignore
    let dayPoolID = event.transaction.hash.concat('-').concat(dayID.toString());
    let poolData = (await db.query.poolData.findFirst({
      where: eq(schema.poolData.id, dayPoolID.toString()),
    })) as PoolData;
    expect(poolData.volumeUSD).toEqual(volumeUSD.stripTrailingZero().getValue());
    expect(poolData.volumeJetton0).toEqual(amount0Abs.stripTrailingZero().getValue());
    expect(poolData.volumeJetton1).toEqual(amount1Abs.stripTrailingZero().getValue());
    expect(poolData.feesUSD).toEqual(feesUSD.stripTrailingZero().getValue());
    expect(poolData.protocolFeesUSD).toEqual(protocolUSD.stripTrailingZero().getValue());

    //@ts-ignore
    let jetton0DayID = jettons[0].id.toString().concat('-').concat(dayID.toString());
    let jetton0DayData = (await db.query.jettonData.findFirst({
      where: eq(schema.jettonData.id, jetton0DayID),
    })) as schema.JettonData;
    expect(jetton0DayData.volumeUSD).toEqual(volumeUSD.stripTrailingZero().getValue());
    expect(jetton0DayData.volume).toEqual(amount0Abs.stripTrailingZero().getValue());
    expect(jetton0DayData.feesUSD).toEqual(feesUSD.stripTrailingZero().getValue());
    expect(jetton0DayData.protocolFeesUSD).toEqual(protocolUSD.stripTrailingZero().getValue());

    //@ts-ignore
    let jetton1DayID = jettons[1].id.toString().concat('-').concat(dayID.toString());
    let jetton1DayData = (await db.query.jettonData.findFirst({
      where: eq(schema.jettonData.id, jetton1DayID),
    })) as schema.JettonData;
    expect(jetton1DayData.volumeUSD).toEqual(volumeUSD.stripTrailingZero().getValue());
    expect(jetton1DayData.volume).toEqual(amount1Abs.stripTrailingZero().getValue());
    expect(jetton1DayData.feesUSD).toEqual(feesUSD.stripTrailingZero().getValue());
    expect(jetton1DayData.protocolFeesUSD).toEqual(protocolUSD.stripTrailingZero().getValue());
  });

  it('should handle second swap event', async () => {
    const event = getSecondMockSwapEvent();
    let dayID = Math.floor(event.block.timestamp / ONE_DAY_IN_MILLISECONDS); // rounded
    //@ts-ignore
    let _preRouter = (await db.query.router.findFirst({})) as Router;
    //@ts-ignore
    let _prePool = (await db.query.pool.findFirst({})) as Pool;
    //@ts-ignore
    let _preJettons = (await db.query.jetton.findMany({})) as Jetton[];
    //@ts-ignore
    let _preRouterData = (await db.query.routerData.findFirst({
      where: eq(schema.routerData.id, dayID.toString()),
    })) as RouterData;
    //@ts-ignore
    let jetton0DayID = _preJettons[0].id.toString().concat('-').concat(dayID.toString());
    let _preJetton0DayData = (await db.query.jettonData.findFirst({
      where: eq(schema.jettonData.id, jetton0DayID),
    })) as schema.JettonData;
    //@ts-ignore
    let jetton1DayID = _preJettons[0].id.toString().concat('-').concat(dayID.toString());
    let _preJetton1DayData = (await db.query.jettonData.findFirst({
      where: eq(schema.jettonData.id, jetton0DayID),
    })) as schema.JettonData;

    await handleSwap(event);

    //@ts-ignore
    let router = (await db.query.router.findFirst({})) as Router;
    //@ts-ignore
    let jettons = (await db.query.jetton.findMany({})) as Jetton[];
    //@ts-ignore
    let pool = (await db.query.pool.findFirst({})) as Pool;
    expect(router.txCount).toEqual((BigInt(_preRouter.txCount) + 1n).toString());

    let amount0 = convertJettonToDecimal(event.amount0, jettons[0]);
    let amount1 = convertJettonToDecimal(event.amount1, jettons[1]);
    let amount0Abs = amount0.compareTo(new BigDecimal('0')) === -1 ? amount0.negate() : amount0;
    let amount1Abs = amount1.compareTo(new BigDecimal('0')) === -1 ? amount1.negate() : amount1;
    let ton = amount0Abs
      .multiply(new BigDecimal(jettons[0].derivedTon))
      .add(amount1Abs.multiply(new BigDecimal(jettons[1].derivedTon)));
    const usd = ton.multiply(new BigDecimal(router.tonPriceUSD));
    const volumeTon = ton.divide(new BigDecimal(TWO_BD));
    const volumeUSD = usd.divide(new BigDecimal(TWO_BD));
    expect(router.totalVolumeTon).toEqual(
      new BigDecimal(_preRouter.totalVolumeTon).add(volumeTon).stripTrailingZero().getValue(),
    );
    expect(router.totalVolumeUSD).toEqual(
      new BigDecimal(_preRouter.totalVolumeUSD).add(volumeUSD).stripTrailingZero().getValue(),
    );
    let protocolAmount0 = convertJettonToDecimal(event.protocolFeesJetton0, jettons[0]);
    let protocolAmount1 = convertJettonToDecimal(event.protocolFeesJetton1, jettons[1]);
    let protocolTon = protocolAmount0
      .multiply(new BigDecimal(jettons[0].derivedTon))
      .add(protocolAmount1.multiply(new BigDecimal(jettons[1].derivedTon)));
    const protocolUSD = protocolTon.multiply(new BigDecimal(router.tonPriceUSD));
    let feesTon = ton
      .divide(new BigDecimal(TWO_BD))
      .multiply(new BigDecimal(pool.feeTier))
      .divide(new BigDecimal('1000000'));
    const feesUSD = usd
      .divide(new BigDecimal(TWO_BD))
      .multiply(new BigDecimal(pool.feeTier))
      .divide(new BigDecimal('1000000'));
    const feesProtocolTon = protocolTon;
    const feesProtocolUSD = protocolUSD;
    expect(router.totalFeesTon).toEqual(
      new BigDecimal(_preRouter.totalFeesTon).add(feesTon).stripTrailingZero().getValue(),
    );
    expect(router.totalFeesUSD).toEqual(
      new BigDecimal(_preRouter.totalFeesUSD).add(feesUSD).stripTrailingZero().getValue(),
    );
    expect(router.totalProtocolFeesTon).toEqual(
      new BigDecimal(_preRouter.totalProtocolFeesTon)
        .add(feesProtocolTon)
        .stripTrailingZero()
        .getValue(),
    );
    expect(router.totalProtocolFeesUSD).toEqual(
      new BigDecimal(_preRouter.totalProtocolFeesUSD)
        .add(feesProtocolUSD)
        .stripTrailingZero()
        .getValue(),
    );
    expect(router.tonPriceUSD).toEqual('2');

    // pool checker
    expect(pool.volumeJetton0).toEqual(
      new BigDecimal(_prePool.volumeJetton0).add(amount0Abs).stripTrailingZero().getValue(),
    );
    expect(pool.volumeJetton1).toEqual(
      new BigDecimal(_prePool.volumeJetton1).add(amount1Abs).stripTrailingZero().getValue(),
    );
    expect(pool.volumeUSD).toEqual(
      new BigDecimal(_prePool.volumeUSD).add(volumeUSD).stripTrailingZero().getValue(),
    );
    expect(pool.feesUSD).toEqual(
      new BigDecimal(_prePool.feesUSD).add(feesUSD).stripTrailingZero().getValue(),
    );
    expect(pool.protocolFeesUSD).toEqual(
      new BigDecimal(_prePool.protocolFeesUSD).add(feesProtocolUSD).stripTrailingZero().getValue(),
    );
    expect(pool.txCount).toEqual((BigInt(_prePool.txCount) + 1n).toString());
    expect(pool.tick).toEqual(BigInt(event.tick));
    expect(pool.liquidity).toEqual(event.liquidity.toString());
    expect(pool.sqrtPrice).toEqual(event.sqrtPriceX96.toString());
    let prices = sqrtPriceX96ToJettonPrices(event.sqrtPriceX96, jettons[0], jettons[1]);
    expect(pool.jetton0Price).toEqual(prices[0].stripTrailingZero().getValue());
    expect(pool.jetton1Price).toEqual(prices[1].stripTrailingZero().getValue());
    expect(pool.totalValueLockedJetton0).toEqual(
      new BigDecimal(_prePool.totalValueLockedJetton0).add(amount0).stripTrailingZero().getValue(),
    );
    expect(pool.totalValueLockedJetton1).toEqual(
      new BigDecimal(_prePool.totalValueLockedJetton1).add(amount1).stripTrailingZero().getValue(),
    );

    // // jetton checker
    expect(jettons[0].volume).toEqual(
      new BigDecimal(_preJettons[0].volume).add(amount0Abs).stripTrailingZero().getValue(),
    );
    expect(jettons[0].feesUSD).toEqual(
      new BigDecimal(_preJettons[0].feesUSD).add(feesUSD).stripTrailingZero().getValue(),
    );
    expect(jettons[0].protocolFeesUSD).toEqual(
      new BigDecimal(_preJettons[0].protocolFeesUSD)
        .add(feesProtocolUSD)
        .stripTrailingZero()
        .getValue(),
    );
    expect(jettons[0].volumeUSD).toEqual(
      new BigDecimal(_preJettons[0].volumeUSD).add(volumeUSD).stripTrailingZero().getValue(),
    );
    expect(jettons[0].txCount).toEqual((BigInt(_preJettons[0].txCount) + 1n).toString());
    expect(jettons[0].derivedUSD).toEqual('1');
    expect(jettons[0].totalValueLocked).toEqual('15.5');

    expect(jettons[1].volume).toEqual(
      new BigDecimal(_preJettons[1].volume).add(amount1Abs).stripTrailingZero().getValue(),
    );
    expect(jettons[1].feesUSD).toEqual(
      new BigDecimal(_preJettons[1].feesUSD).add(feesUSD).stripTrailingZero().getValue(),
    );
    expect(jettons[1].protocolFeesUSD).toEqual(
      new BigDecimal(_preJettons[1].protocolFeesUSD)
        .add(feesProtocolUSD)
        .stripTrailingZero()
        .getValue(),
    );
    expect(jettons[1].volumeUSD).toEqual(
      new BigDecimal(_preJettons[1].volumeUSD).add(volumeUSD).stripTrailingZero().getValue(),
    );
    expect(jettons[1].txCount).toEqual((BigInt(_preJettons[1].txCount) + 1n).toString());
    expect(jettons[1].derivedUSD).toEqual('1');
    expect(jettons[1].totalValueLocked).toEqual('9.999998');

    // swap check
    //@ts-ignore
    let swap = (await db.query.swap.findFirst({
      where: eq(schema.swap.id, 2),
    })) as Swap;
    expect(swap.amount0).toEqual(amount0.stripTrailingZero().getValue());
    expect(swap.amount1).toEqual(amount1.stripTrailingZero().getValue());
    expect(swap.amountUSD).toEqual(volumeUSD.stripTrailingZero().getValue());
    expect(swap.poolId).toEqual(pool.id);
    expect(swap.sqrtPriceX96).toEqual(event.sqrtPriceX96.toString());
    expect(swap.tick).toEqual(event.tick);
    expect(swap.amountFeeUSD).toEqual(protocolUSD.stripTrailingZero().getValue());

    //@ts-ignore
    let routerData = (await db.query.routerData.findFirst({
      where: eq(schema.routerData.id, dayID.toString()),
    })) as RouterData;
    expect(routerData.volumeUSD).toEqual(
      new BigDecimal(_preRouterData.volumeUSD).add(volumeUSD).stripTrailingZero().getValue(),
    );
    expect(routerData.volumeTon).toEqual(
      new BigDecimal(_preRouterData.volumeTon).add(volumeTon).stripTrailingZero().getValue(),
    );
    expect(routerData.txCount).toEqual('3');
    expect(routerData.protocolFeesUSD).toEqual(
      new BigDecimal(_preRouterData.protocolFeesUSD)
        .add(feesProtocolUSD)
        .stripTrailingZero()
        .getValue(),
    );
    expect(routerData.feesUSD).toEqual(
      new BigDecimal(_preRouterData.feesUSD).add(feesUSD).stripTrailingZero().getValue(),
    );

    //@ts-ignore
    let dayPoolID = event.transaction.hash.concat('-').concat(dayID.toString());
    let poolData = (await db.query.poolData.findFirst({
      where: eq(schema.poolData.id, dayPoolID.toString()),
    })) as PoolData;
    expect(poolData.volumeUSD).toEqual(volumeUSD.stripTrailingZero().getValue());
    expect(poolData.volumeJetton0).toEqual(amount0Abs.stripTrailingZero().getValue());
    expect(poolData.volumeJetton1).toEqual(amount1Abs.stripTrailingZero().getValue());
    expect(poolData.feesUSD).toEqual(feesUSD.stripTrailingZero().getValue());
    expect(poolData.protocolFeesUSD).toEqual(protocolUSD.stripTrailingZero().getValue());

    //@ts-ignore
    let jetton0DayData = (await db.query.jettonData.findFirst({
      where: eq(schema.jettonData.id, jetton0DayID),
    })) as schema.JettonData;
    expect(jetton0DayData.volumeUSD).toEqual(
      new BigDecimal(_preJetton0DayData.volumeUSD).add(volumeUSD).stripTrailingZero().getValue(),
    );
    expect(jetton0DayData.volume).toEqual(
      new BigDecimal(_preJetton0DayData.volume).add(amount0Abs).stripTrailingZero().getValue(),
    );
    expect(jetton0DayData.feesUSD).toEqual(
      new BigDecimal(_preJetton0DayData.feesUSD).add(feesUSD).stripTrailingZero().getValue(),
    );
    expect(jetton0DayData.protocolFeesUSD).toEqual(
      new BigDecimal(_preJetton0DayData.protocolFeesUSD)
        .add(protocolUSD)
        .stripTrailingZero()
        .getValue(),
    );

    //@ts-ignore
    let jetton1DayData = (await db.query.jettonData.findFirst({
      where: eq(schema.jettonData.id, jetton1DayID),
    })) as schema.JettonData;
    expect(jetton1DayData.volumeUSD).toEqual(
      new BigDecimal(_preJetton1DayData.volumeUSD).add(volumeUSD).stripTrailingZero().getValue(),
    );
    expect(jetton1DayData.volume).toEqual(
      new BigDecimal(_preJetton1DayData.volume).add(amount0Abs).stripTrailingZero().getValue(),
    );
    expect(jetton1DayData.feesUSD).toEqual(
      new BigDecimal(_preJetton1DayData.feesUSD).add(feesUSD).stripTrailingZero().getValue(),
    );
    expect(jetton1DayData.protocolFeesUSD).toEqual(
      new BigDecimal(_preJetton1DayData.protocolFeesUSD)
        .add(protocolUSD)
        .stripTrailingZero()
        .getValue(),
    );
  });
});
