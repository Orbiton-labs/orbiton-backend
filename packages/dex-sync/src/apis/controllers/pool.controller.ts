import { catchAsync } from "../../utils";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import PoolRepository from "../repositories/pool.repository";

namespace PoolController {
  export const getAll = catchAsync(async (req: Request, res: Response) => {
    const data = await PoolRepository.getAll();
    res.status(StatusCodes.OK).json({
      message: "Get pool successfully",
      data,
    });
  });
}

export default PoolController;
