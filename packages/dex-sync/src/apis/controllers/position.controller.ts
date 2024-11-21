import { DuckDbNode } from "src/db";
import { catchAsync, TableName } from "../../utils";
import { Request, Response } from "express";

namespace PositionController {
  export const getAll = catchAsync(async (req: Request, res: Response) => {
    const { poolAddress, userAddress } = req.query;
    if (!poolAddress || !userAddress) {
      throw new Error("Missing required fields");
    }

    const data = await DuckDbNode.instances.select(TableName.Position, {
      where: {},
    });
    res.status(200).json({
      message: "Get position successfully",
      data,
    });
  });
}

export default PositionController;
