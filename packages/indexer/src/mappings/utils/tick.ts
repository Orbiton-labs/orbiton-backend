/* eslint-disable prefer-const */
import { MintEvent } from '@src/@types/core.type';
import { ONE_BD, ZERO_BD, ZERO_BI } from '../../constants';
import { Tick } from '@src/models/tick';
import { Pool } from '@src/models/pool';
import BigDecimal from 'decimal.js';
import { bigDecimalExponated } from '.';

export function createTick(tickId: string, tickIdx: bigint, pool: Pool, event: MintEvent): Tick {
  let tickData = {
    id: tickId,
    tickIdx: tickIdx,
    collectedFeesJetton0: ZERO_BD,
    collectedFeesJetton1: ZERO_BD,
    collectedFeesUSD: ZERO_BD,
    liquidityGross: ZERO_BD,
    liquidityNet: ZERO_BD,
    liquidityProviderCount: ZERO_BD,
    price0: ONE_BD,
    price1: ONE_BD,
    volumeJetton0: ZERO_BD,
    volumeJetton1: ZERO_BD,
    volumeUSD: ZERO_BD,
    feesUSD: ZERO_BD,
    poolAddress: pool.address,
    poolId: pool.id,
    feeGrowthOutside0X128: ZERO_BD,
    feeGrowthOutside1X128: ZERO_BD,
    timestamp: new Date(event.block.timestamp),
  } as Tick;

  // 1.0001^tick is token1/token0.
  const price0 = bigDecimalExponated(new BigDecimal('1.0001'), BigInt(tickIdx));
  tickData.price0 = price0.toString();
  tickData.price1 = new BigDecimal(ONE_BD).div(price0).toString();
  return tickData;
}

export function feeTierToTickSpacing(feeTier: bigint): bigint {
  if (feeTier == 10000n) {
    return 200n;
  }
  if (feeTier == 3000n) {
    return 60n;
  }
  if (feeTier == 500n) {
    return 10n;
  }
  if (feeTier == 100n) {
    return 1n;
  }
  throw Error('Unexpected fee tier');
}
