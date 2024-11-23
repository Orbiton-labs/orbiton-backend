import JSBI from "jsbi";

const ONE = JSBI.BigInt(1);

export class FullMath {
  public static mulDivRoundingUp(a: JSBI, b: JSBI, denominator: JSBI): JSBI {
    const product = JSBI.multiply(a, b);
    const remainder = JSBI.remainder(product, denominator);

    if (JSBI.equal(remainder, JSBI.BigInt(0))) {
      return JSBI.divide(product, denominator);
    }

    const rounded = JSBI.add(product, JSBI.subtract(denominator, ONE));
    return JSBI.divide(rounded, denominator);
  }

  public static mulDiv(a: JSBI, b: JSBI, denominator: JSBI): JSBI {
    const product = JSBI.multiply(a, b);
    return JSBI.divide(product, denominator);
  }
}
