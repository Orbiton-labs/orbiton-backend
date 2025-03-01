import { TraceEvent } from '@src/@types';
import { ONE_DAY_IN_MILLISECONDS, ZERO_BD, ZERO_BI } from '@src/constants';
import { Router } from '@src/models';
import { db } from '@src/db';
import * as schema from '@src/models';
import { eq } from 'drizzle-orm';

export const updateRouterDayData = async (router: Router, event: TraceEvent) => {
  const timestamp = event.block.timestamp;
  let dayID = Math.floor(timestamp / ONE_DAY_IN_MILLISECONDS);
  let dayStartTimestamp = dayID * ONE_DAY_IN_MILLISECONDS;
  let routerDayData = await db.query.routerData.findFirst({
    where: eq(schema.routerData.id, dayID.toString()),
  });
  if (!routerDayData) {
    routerDayData = {
      id: dayID.toString(),
      timestamp: new Date(dayStartTimestamp),
      volumeTon: ZERO_BD,
      volumeUSD: ZERO_BD,
      feesUSD: ZERO_BD,
      protocolFeesUSD: ZERO_BD,
      txCount: ZERO_BD,
      tvlUSD: ZERO_BD,
    };
  }
  routerDayData.tvlUSD = router.totalValueLockedUSD;
  routerDayData.txCount = router.txCount;
  await db
    .insert(schema.routerData)
    .values({ ...routerDayData })
    .onConflictDoUpdate({
      target: schema.routerData.id,
      set: {
        timestamp: routerDayData.timestamp,
        volumeTon: routerDayData.volumeTon,
        volumeUSD: routerDayData.volumeUSD,
        feesUSD: routerDayData.feesUSD,
        protocolFeesUSD: routerDayData.protocolFeesUSD,
        txCount: routerDayData.txCount,
        tvlUSD: routerDayData.tvlUSD,
      },
    });
  return routerDayData;
};
