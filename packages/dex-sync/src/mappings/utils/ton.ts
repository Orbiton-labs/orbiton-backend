import { TraceEvent } from '@src/@types';
import { ONE_BD, snakeToCamel, ZERO_ADDRESS } from '@src/constants';
import { Jetton, Tick } from '@src/models';
import { tonApiClient } from '@src/services/ton-api';
import { setTimeout } from 'timers/promises';
import * as schema from '@src/models';
import { DatabaseType, db } from '@src/db';
import { eq } from 'drizzle-orm';

export const getTonPrice = async (): Promise<number> => {
  while (true) {
    try {
      const rateData = await tonApiClient.rates.getRates({
        tokens: ['TON'],
        currencies: ['TON,USDT'],
      });
      const tonRate = rateData.rates['TON'];
      const tonPrice = tonRate.prices['USDT'];
      return tonPrice;
    } catch (err) {
      console.log(err);
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
      const tokenId = snakeToCamel(jetton.id);
      const rateData = await tonApiClient.rates.getRates({
        tokens: [jetton.id],
        currencies: ['TON'],
      });
      const tonRate = rateData.rates?.[tokenId];
      const jettonPricePerTon = tonRate.prices['TON'];
      return jettonPricePerTon.toString();
    } catch (err) {
      console.log(err, err.stack);
    }
    await setTimeout(500);
  }
};

export const updateTickFeeVarsAndSave = async (
  tick: Tick,
  event: TraceEvent,
  _db: DatabaseType = db,
) => {
  // let poolAddress = event.address;
  // TODO: Fetch fee growth outside 0 and 1 from contract here
  // let tickResult = poolContract.ticks(tick.tickIdx.toI32());
  // tick.feeGrowthOutside0X128 = tickResult.value2;
  // tick.feeGrowthOutside1X128 = tickResult.value3;
  // tick.save();
  const { id, ...tickData } = tick;
  await _db
    .insert(schema.tick)
    .values(tick)
    .onConflictDoUpdate({
      target: schema.tick.id,
      set: {
        ...tickData,
      },
    });
};

export const loadTickUpdateFeeVarsAndSave = async (tickId: bigint, event: TraceEvent) => {
  const poolAddress = event.address;
  const encodeTickId = poolAddress.toString().concat('#').concat(tickId.toString());
  let tick = await db.query.tick.findFirst({
    where: eq(schema.tick.id, encodeTickId),
  });
  if (tick !== null) {
    await updateTickFeeVarsAndSave(tick!, event);
  }
};
