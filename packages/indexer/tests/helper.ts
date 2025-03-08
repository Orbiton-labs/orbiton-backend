import BigDecimal from 'decimal.js';
import { BigDecimalConfig } from '../src/mappings/constant';

// returns the sqrt price as a 64x96
BigDecimal.set(BigDecimalConfig);
export function encodePriceSqrt(reserve1: bigint, reserve0: bigint): bigint {
  return BigInt(
    new BigDecimal(reserve1.toString())
      .div(reserve0.toString())
      .sqrt()
      .mul(new BigDecimal(2).pow(96))
      .floor()
      .toString(),
  );
}
