import { IPool } from "../../@types";
import PoolModel from "../models/pool.model";

namespace PoolRepository {
  export const getAll = async () => {
    return PoolModel.find();
  };

  export const getByPoolAddress = async (poolAddress: string) => {
    return PoolModel.findOne({
      poolAddress,
    });
  };

  export const create = async (data: IPool) => {
    const item = await PoolModel.findOne({
      poolAddress: data.poolAddress,
    });
    if (item) {
      return;
    }
    return PoolModel.create({
      ...data,
    });
  };
}

export default PoolRepository;
