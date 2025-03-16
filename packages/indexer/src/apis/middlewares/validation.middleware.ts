import { RequestHandler } from 'express';
import { z, ZodError } from 'zod';
import { StatusCodes } from 'http-status-codes';

export function validateQueryData(schema: z.ZodObject<any, any>): RequestHandler {
  return (req, res, next) => {
    validateData(schema, req.query, res, next);
  };
}

export function validateBodyData(schema: z.ZodObject<any, any>): RequestHandler {
  return (req, res, next) => {
    validateData(schema, req.body, res, next);
  };
}

function validateData(schema: z.ZodObject<any, any>, data: any, res: any, next: any) {
  try {
    schema.parse(data);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessages = error.errors.map((issue: any) => ({
        message: `${issue.path.join('.')} is ${issue.message}`,
      }));
      res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Invalid data',
        details: errorMessages,
      });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
      });
    }
  }
}
