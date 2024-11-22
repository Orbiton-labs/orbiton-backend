import { query } from "express-validator";

namespace PositionMiddleware {
  export const validateGetAll = () => {
    return [
      query("poolId")
        .exists()
        .notEmpty()
        .withMessage("poolId can not be empty"),
      query("userAddress")
        .exists()
        .notEmpty()
        .withMessage("userAddress can not be empty"),
    ];
  };
}

export default PositionMiddleware;
