import { DuckDbNode } from "src/db";
import { catchAsync, TableName } from "../../utils";
import { Request, Response } from "express";

namespace PoolController {
  export const getAll = catchAsync(async (req: Request, res: Response) => {
    const data = await DuckDbNode.instances.select(TableName.Pool, {
      where: {},
    });
    res.status(200).json({
      message: "Get pool successfully",
      data,
    });
  });
}

export default PoolController;
