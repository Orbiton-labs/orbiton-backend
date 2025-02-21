import { TraceTx } from '@src/@types';
import { ONE_BD, ZERO_ADDRESS } from '@src/constants';
import { Jetton, Tick } from '@src/models';
import { tonApiClient } from '@src/services/ton-api';
import { setTimeout } from 'timers/promises';
import * as schema from '@src/models';
import { db } from '@src/db';

export const getTonPrice = async (): Promise<number> => {
  while (true) {
    try {
      const rateData = await tonApiClient.rates.getRates({
        tokens: ['TON'],
        currencies: ['TON', 'USDT'],
      });
      const tonRate = rateData.rates['TON'];
      const tonPrice = tonRate.prices['USDT'];
      return tonPrice;
    } catch (err) {}
    await setTimeout(500);
  }
};

// On this we will use off-chain data instead of on-chain for correct price
export const findTonPerJetton = async (jetton: Jetton): Promise<string> => {
  while (true) {
    try {
      if (jetton.address === ZERO_ADDRESS) {
        return ONE_BD;
      }

      const rateData = await tonApiClient.rates.getRates({
        tokens: [jetton.address],
        currencies: ['TON'],
      });
      const tonRate = rateData.rates[jetton.address];
      const jettonPricePerTon = tonRate.prices['TON'];
      return jettonPricePerTon.toString();
    } catch (err) {}
    await setTimeout(500);
  }
};

export const updateTickFeeVarsAndSave = async (tick: Tick, event: TraceTx) => {
  // let poolAddress = event.address;
  // TODO: Fetch fee growth outside 0 and 1 from contract here
  // let tickResult = poolContract.ticks(tick.tickIdx.toI32());
  // tick.feeGrowthOutside0X128 = tickResult.value2;
  // tick.feeGrowthOutside1X128 = tickResult.value3;
  // tick.save();
  await db
    .insert(schema.tick)
    .values(tick)
    .onConflictDoUpdate({
      target: schema.tick.id,
      set: {
        ...tick,
      },
    });
};
