import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { sendError } from '../utils/response';
import { Role } from '@prisma/client';

export const requireRole = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', null, 401);
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Forbidden: insufficient permissions', null, 403);
    }
    next();
  };
};