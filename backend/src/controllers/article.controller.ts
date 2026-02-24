import { Response } from 'express';
import { AuthRequest } from '../types';
import { articleService } from '../services/article.service';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

export class ArticleController {
  async create(req: AuthRequest, res: Response) {
    try {
      const article = await articleService.create(req.body, req.user!.sub);
      return sendSuccess(res, 'Article created successfully', article, 201);
    } catch (err: any) {
      if (err.status) return sendError(res, err.message, null, err.status);
      throw err;
    }
  }

  async getMyArticles(req: AuthRequest, res: Response) {
    try {
      const { articles, page, size, total } = await articleService.getMyArticles(
        req.user!.sub,
        req.query as any
      );
      return sendPaginated(res, 'Articles retrieved', articles, page, size, total);
    } catch (err: any) {
      if (err.status) return sendError(res, err.message, null, err.status);
      throw err;
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const article = await articleService.update(req.params.id, req.user!.sub, req.body);
      return sendSuccess(res, 'Article updated successfully', article);
    } catch (err: any) {
      if (err.status === 403) return sendError(res, 'Forbidden', null, 403);
      if (err.status) return sendError(res, err.message, null, err.status);
      throw err;
    }
  }

  async softDelete(req: AuthRequest, res: Response) {
    try {
      await articleService.softDelete(req.params.id, req.user!.sub);
      return sendSuccess(res, 'Article deleted successfully', null);
    } catch (err: any) {
      if (err.status === 403) return sendError(res, 'Forbidden', null, 403);
      if (err.status) return sendError(res, err.message, null, err.status);
      throw err;
    }
  }

  async getPublicFeed(req: AuthRequest, res: Response) {
    try {
      const { articles, page, size, total } = await articleService.getPublicFeed(req.query as any);
      return sendPaginated(res, 'Articles retrieved', articles, page, size, total);
    } catch (err: any) {
      if (err.status) return sendError(res, err.message, null, err.status);
      throw err;
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const skipReadLog = (req as any).skipReadLog === true;
      const article = await articleService.getById(
        req.params.id,
        req.user?.sub,
        skipReadLog
      );
      return sendSuccess(res, 'Article retrieved successfully', article);
    } catch (err: any) {
      if (err.status === 410) return sendError(res, err.message, null, 410);
      if (err.status) return sendError(res, err.message, null, err.status);
      throw err;
    }
  }

  async getDashboard(req: AuthRequest, res: Response) {
    try {
      const { articles, page, size, total } = await articleService.getDashboard(
        req.user!.sub,
        req.query as any
      );
      return sendPaginated(res, 'Dashboard retrieved', articles, page, size, total);
    } catch (err: any) {
      if (err.status) return sendError(res, err.message, null, err.status);
      throw err;
    }
  }
}

export const articleController = new ArticleController();