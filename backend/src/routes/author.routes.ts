import { Router } from 'express';
import { articleController } from '../controllers/article.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

/**
 * @openapi
 * /api/author/dashboard:
 *   get:
 *     tags:
 *       - Author Dashboard
 *     summary: Author performance dashboard (Author only)
 *     description: Returns paginated list of author's articles with TotalViews aggregated from DailyAnalytics. Excludes soft-deleted articles.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     Object:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           title: { type: string }
 *                           category: { type: string }
 *                           status: { type: string }
 *                           createdAt: { type: string, format: date-time }
 *                           TotalViews: { type: integer }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/dashboard',
  authenticate,
  requireRole('author'),
  articleController.getDashboard.bind(articleController)
);

export default router;