export const asyncErrorWrapper = (handler: any) => {
  return async (req: any, res: any, next: any) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};
