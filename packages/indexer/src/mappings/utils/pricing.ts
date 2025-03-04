import { Jetton, Router } from '@src/models';
import BigDecimal from 'js-big-decimal';
import { exponentToBigDecimal } from './jetton';

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
  if (new BigDecimal(jetton0.derivedTon).compareTo(new BigDecimal('0')) == 0) {
    ton = amount1.multiply(new BigDecimal(jetton1.derivedTon)).multiply(new BigDecimal('2'));
  }
  if (new BigDecimal(jetton1.derivedTon).compareTo(new BigDecimal('0')) == 0) {
    ton = amount0.multiply(new BigDecimal(jetton0.derivedTon)).multiply(new BigDecimal('2'));
  }
  let usd = ton.multiply(new BigDecimal(router.tonPriceUSD));

  return { ton, usd };
}

let Q192 = 2n ** 192n;
export function sqrtPriceX96ToJettonPrices(
  sqrtPriceX96: bigint,
  jetton0: Jetton,
  jetton1: Jetton,
): BigDecimal[] {
  let num = new BigDecimal((sqrtPriceX96 * sqrtPriceX96).toString());
  let denom = new BigDecimal(Q192.toString());
  let price1 = num
    .divide(denom)
    .multiply(exponentToBigDecimal(BigInt(jetton0.decimals)))
    .multiply(exponentToBigDecimal(BigInt(jetton1.decimals)));

  let price0 = new BigDecimal('1').divide(price1);
  return [price0, price1];
}
