import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { AuthRequest } from '../types';

/**
 * BONUS: Prevents same user/IP from spamming ReadLog entries.
 * Key: IP + articleId → max 1 read log per 30 seconds per article per user/IP.
 * This uses an in-memory store (works for single instance).
 * For multi-instance deployments, swap the store for RedisStore from rate-limit-redis.
 */
export const readEventRateLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 1,              // 1 read log creation per window
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.sub || 'guest';
    const articleId = req.params.id || 'unknown';
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    return `read:${ip}:${userId}:${articleId}`;
  },
  skip: () => false,
  // When rate-limited, we skip creating a log but still serve the article
  handler: (req: Request, res: Response, next: Function) => {
    // We don't block the request - we just skip creating the read log
    // Flag it so the controller knows
    (req as any).skipReadLog = true;
    next();
  },
  standardHeaders: false,
  legacyHeaders: false,
});