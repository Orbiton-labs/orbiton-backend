import { Jetton, Router } from '@src/models';
import BigDecimal from 'js-big-decimal';

export interface AmountType {
  ton: BigDecimal;
  usd: BigDecimal;
}

export function getAdjustedAmounts(
  router: Router,
  amount0: BigDecimal,
  jetton0: Jetton,
  amount1: BigDecimal,
  jetton1: Jetton,
): AmountType {
  let ton = amount0
    .multiply(new BigDecimal(jetton0.derivedTon))
    .add(amount1.multiply(new BigDecimal(jetton1.derivedTon)));
  if (new BigDecimal(jetton0.derivedTon).compareTo(new BigDecimal('0'))) {
    ton = amount1.multiply(new BigDecimal(jetton1.derivedTon)).multiply(new BigDecimal('2'));
  }
  if (new BigDecimal(jetton1.derivedTon).compareTo(new BigDecimal('0'))) {
    ton = amount0.multiply(new BigDecimal(jetton0.derivedTon)).multiply(new BigDecimal('2'));
  }
  let usd = ton.multiply(new BigDecimal(router.tonPriceUSD));
  return { ton, usd };
}
