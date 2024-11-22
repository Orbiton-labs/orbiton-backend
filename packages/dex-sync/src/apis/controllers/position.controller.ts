import { catchAsync } from "../../utils";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import PositionRepository from "../repositories/position.repository";

namespace PositionController {
  export const getAll = catchAsync(async (req: Request, res: Response) => {
    const { poolId, userAddress } = req.query;
    const data = await PositionRepository.getAll({
      poolId: poolId as string,
      userAddress: userAddress as string,
    });
    res.status(StatusCodes.OK).json({
      message: "Get position successfully",
      data,
    });
  });
}

export default PositionController;
