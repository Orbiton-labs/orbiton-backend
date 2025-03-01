import { NextFunction, Request, Response } from 'express';

export const catchAsync =
  (func: any) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      await func(req, res, next);
    } catch (err) {
      next(err);
    } finally {
      /* empty */
    }
  };
