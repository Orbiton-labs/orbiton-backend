import { Info as TickInfo } from "orbiton-contracts/build/tlb/tick";

export class FeeGrowthMath {
  static getFeeGrowthInside = (
    tickLowerInfo: TickInfo,
    tickUpperInfo: TickInfo,
    tickLower: bigint,
    tickUpper: bigint,
    tickCurrent: bigint,
    feeGrowthGlobal0X128: bigint,
    feeGrowthGlobal1X128: bigint
  ) => {
    let feeGrowthBelow0X128 = 0n;
    let feeGrowthBelow1X128 = 0n;
    if (tickCurrent >= tickLower) {
      feeGrowthBelow0X128 = tickLowerInfo.fee_growth_outside_0_x128;
      feeGrowthBelow1X128 = tickLowerInfo.fee_growth_outside_1_x128;
    } else {
      feeGrowthBelow0X128 =
        feeGrowthGlobal0X128 - tickLowerInfo.fee_growth_outside_0_x128;
      feeGrowthBelow1X128 =
        feeGrowthGlobal1X128 - tickLowerInfo.fee_growth_outside_1_x128;
    }
    let feeGrowthAbove0X128 = 0n;
    let feeGrowthAbove1X128 = 0n;
    if (tickCurrent < tickUpper) {
      feeGrowthAbove0X128 = tickUpperInfo.fee_growth_outside_0_x128;
      feeGrowthAbove1X128 = tickUpperInfo.fee_growth_outside_1_x128;
    } else {
      feeGrowthAbove0X128 =
        feeGrowthGlobal0X128 - tickUpperInfo.fee_growth_outside_0_x128;
      feeGrowthAbove1X128 =
        feeGrowthGlobal1X128 - tickUpperInfo.fee_growth_outside_1_x128;
    }
    return [
      feeGrowthGlobal0X128 - feeGrowthBelow0X128 - feeGrowthAbove0X128,
      feeGrowthGlobal1X128 - feeGrowthBelow1X128 - feeGrowthAbove1X128,
    ];
  };
}
