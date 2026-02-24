import { Request } from 'express';
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationQuery {
  page?: string;
  size?: string;
}

export interface ArticleQuery extends PaginationQuery {
  category?: string;
  author?: string;
  q?: string;
  includeDeleted?: string;
}