export class BigIntHelper {
  static abs(value: bigint): bigint {
    return value < 0n ? -value : value;
  }
}
