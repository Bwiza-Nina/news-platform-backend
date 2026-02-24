import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  logger.error({
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Never leak stack traces to the client
  return res.status(500).json({
    Success: false,
    Message: 'Internal server error',
    Object: null,
    Errors: ['An unexpected error occurred. Please try again later.'],
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  return res.status(404).json({
    Success: false,
    Message: `Route ${req.method} ${req.path} not found`,
    Object: null,
    Errors: null,
  });
};