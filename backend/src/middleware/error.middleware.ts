import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({
    message: err.message || err.toString(),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });
  return res.status(err.status || 500).json({
    Success: false,
    Message: err.message || 'Internal server error',
    Object: null,
    Errors: [err.message || 'An unexpected error occurred. Please try again later.'],
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