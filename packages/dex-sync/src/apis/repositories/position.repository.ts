import { IPosition } from "../../@types";
import PositionModel from "../models/position.model";

namespace PositionRepository {
  export const getAll = async ({
    poolId,
    userAddress,
  }: {
    poolId: string;
    userAddress?: string;
  }) => {
    return PositionModel.find({
      poolId,
      userAddress,
    });
  };

  export const create = async (data: IPosition) => {
    const position = await PositionModel.findOne({
      ownerAddress: data.ownerAddress,
      tickLower: data.tickLower,
      tickUpper: data.tickUpper,
      poolId: data.poolId,
    });

    if (position) {
      position.liquidity = (
        BigInt(position.liquidity) + BigInt(data.liquidity)
      ).toString();
      position.feeGrowthInside0LastX128 = (
        BigInt(position.feeGrowthInside0LastX128) +
        BigInt(data.feeGrowthInside0LastX128)
      ).toString();
      position.feeGrowthInside1LastX128 = (
        BigInt(position.feeGrowthInside1LastX128) +
        BigInt(data.feeGrowthInside1LastX128)
      ).toString();
      position.tokenOwed0 = (
        BigInt(position.tokenOwed0) + BigInt(data.tokenOwed0)
      ).toString();
      position.tokenOwed1 = (
        BigInt(position.tokenOwed1) + BigInt(data.tokenOwed1)
      ).toString();
      await position.save();
      return position;
    } else {
      const newPosition = new PositionModel({
        ...data,
      });

      await newPosition.save();
      return newPosition;
    }
  };
}

export default PositionRepository;
