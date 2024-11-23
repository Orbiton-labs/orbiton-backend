import { IToken } from "../../@types";
import TokensModel from "../models/tokens.model";

namespace TokensRepository {
  export const getAll = async () => {
    return TokensModel.find();
  };

  export const getByAddress = async (address: string) => {
    return TokensModel.findOne({
      address,
    });
  };

  export const create = async (data: IToken) => {
    const item = await TokensModel.findOne({
      address: data.address,
    });
    if (item) {
      return TokensModel.updateOne(
        {
          address: data.address,
        },
        {
          ...data,
        }
      );
    }
    return TokensModel.create({
      ...data,
    });
  };
}
export default TokensRepository;
