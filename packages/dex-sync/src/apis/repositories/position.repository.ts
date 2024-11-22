import { IPosition } from "../../@types";
import PositionModel from "../models/position.model";

namespace PositionRepository {
  export const getAll = async ({
    poolId,
    userAddress,
  }: {
    poolId: string;
    userAddress: string;
  }) => {
    return PositionModel.find({
      poolId,
      userAddress,
    });
  };

  export const create = async (data: IPosition) => {
    return PositionModel.create({
      ...data,
    });
  };
}

export default PositionRepository;
