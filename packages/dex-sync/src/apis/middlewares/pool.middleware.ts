import { check, query } from "express-validator";

namespace PoolMiddleware {
  check;
  export const validateSimulateSwap = () => {
    return [
      query("jettonInAddress")
        .isString()
        .trim()
        .exists()
        .notEmpty()
        .withMessage("jettonInAddress can not be empty"),
      query("jettonInAmount")
        .isString()
        .trim()
        .exists()
        .notEmpty()
        .withMessage("jettonInAmount can not be empty"),
      query("jettonOutAddress")
        .isString()
        .trim()
        .exists()
        .notEmpty()
        .withMessage("jettonOutAddress can not be empty"),
      query("senderAddress")
        .isString()
        .trim()
        .exists()
        .notEmpty()
        .withMessage("senderAddress can not be empty"),
    ];
  };
}

export default PoolMiddleware;
