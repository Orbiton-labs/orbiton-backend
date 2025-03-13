import { TraceEvent } from '@src/@types';
import { ONE_BD, snakeToCamel, ZERO_ADDRESS } from '@src/constants';
import { Jetton, Tick } from '@src/models';
import { tonApiClient } from '@src/services/ton-api';
import { setTimeout } from 'timers/promises';
import * as schema from '@src/models';
import { DatabaseType, db } from '@src/db';
import { eq } from 'drizzle-orm';
import { tonClient } from '@src/services/ton-client';
import { PoolWrapper } from '@orbiton_labs/v3-contracts-sdk';
import { objectWithoutId } from '../common';
import { Address } from '@ton/core';

export const getTonPrice = async (): Promise<number> => {
  while (true) {
    try {
      const rateData = await tonApiClient.rates.getRates({
        tokens: ['TON'],
        currencies: ['TON,USDT'],
      });
      const tonRate = rateData.rates['TON'];
      const tonPrice = tonRate.prices['USDT'];
      return Number(tonPrice.toFixed(3));
    } catch (err) {
      console.log('getTonPrice', err);
    }
    await setTimeout(500);
  }
};

// On this we will use off-chain data instead of on-chain for correct price
export const findTonPerJetton = async (jetton: Jetton): Promise<string> => {
  while (true) {
    try {
      if (jetton.id === ZERO_ADDRESS) {
        return ONE_BD;
      }
      if (
        jetton.id === Address.parse('kQCF8jfV05w00abPcvsW64XNanQ9vateIhCLSkNAQ7Qfo14c').toString()
      ) {
        return ONE_BD;
      }
      if (
        jetton.id === Address.parse('kQCqaCb9S8wqYjPT1d18Z0f-HemRnEDm4heFyNfPKMESADNa').toString()
      ) {
        return '0.1';
      }
      const tokenId = snakeToCamel(jetton.id);
      const rateData = await tonApiClient.rates.getRates({
        tokens: [jetton.id],
        currencies: ['TON'],
      });
      const tonRate = rateData.rates?.[tokenId];
      const jettonPricePerTon = tonRate.prices['TON'];
      return jettonPricePerTon.toFixed(3);
    } catch (err) {
      console.log(err, err.stack);
    }
    await setTimeout(500);
  }
};

export const updateTickFeeVarsAndSave = async (
  tick: Tick,
  poolAddress: Address,
  _db: DatabaseType = db,
) => {
  let poolContract = tonClient.open(PoolWrapper.Pool.createFromAddress(poolAddress));
  let tickResult = await poolContract.getFeesGrowthGlobalAtTick(BigInt(tick.tickIdx));
  tick.feeGrowthOutside0X128 = tickResult[0].toString();
  tick.feeGrowthOutside1X128 = tickResult[1].toString();
  await _db
    .insert(schema.tick)
    .values(tick)
    .onConflictDoUpdate({
      target: schema.tick.id,
      set: {
        ...objectWithoutId(tick),
      },
    });
};

export const loadTickUpdateFeeVarsAndSave = async (tickId: bigint, poolAddress: Address) => {
  const encodeTickId = poolAddress.toString().concat('#').concat(tickId.toString());
  let tick = await db.query.tick.findFirst({
    where: eq(schema.tick.id, encodeTickId),
  });
  if (tick !== null) {
    await updateTickFeeVarsAndSave(tick!, poolAddress);
  }
};
