import { Jetton, Router } from '@src/models';
import BigDecimal from 'decimal.js';
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
    .mul(new BigDecimal(jetton0.derivedTon))
    .add(amount1.mul(new BigDecimal(jetton1.derivedTon)));
  if (new BigDecimal(jetton0.derivedTon).equals(new BigDecimal('0'))) {
    ton = amount1.mul(new BigDecimal(jetton1.derivedTon)).mul(new BigDecimal('2'));
  }
  if (new BigDecimal(jetton1.derivedTon).equals(new BigDecimal('0'))) {
    ton = amount0.mul(new BigDecimal(jetton0.derivedTon)).mul(new BigDecimal('2'));
  }
  let usd = ton.mul(new BigDecimal(router.tonPriceUSD));

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
    .div(denom)
    .mul(exponentToBigDecimal(BigInt(jetton0.decimals)))
    .mul(exponentToBigDecimal(BigInt(jetton1.decimals)));

  let price0 = new BigDecimal('1').div(price1);
  return [price0, price1];
}
