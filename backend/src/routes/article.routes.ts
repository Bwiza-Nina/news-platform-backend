import { Router } from 'express';
import { articleController } from '../controllers/article.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { createArticleSchema, updateArticleSchema } from '../validators/article.validator';
import { readEventRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

/**
 * @openapi
 * /api/articles:
 *   get:
 *     tags:
 *       - Articles (Public)
 *     summary: Get published news feed (public)
 *     description: Returns paginated list of published, non-deleted articles. Supports filtering by category, author name, and keyword search in title.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Exact category match (e.g. "Tech", "Sports")
 *       - in: query
 *         name: author
 *         schema: { type: string }
 *         description: Partial name match of author
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Keyword search in title
 *     responses:
 *       200:
 *         description: Paginated list of articles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/', articleController.getPublicFeed.bind(articleController));

/**
 * @openapi
 * /api/articles/me:
 *   get:
 *     tags:
 *       - Articles (Author)
 *     summary: Get my articles (Author only)
 *     description: Returns all articles by the authenticated author, including drafts. Optionally includes soft-deleted articles.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: includeDeleted
 *         schema: { type: boolean }
 *         description: Set to "true" to include soft-deleted articles
 *     responses:
 *       200:
 *         description: Paginated list of author's articles
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not an author)
 */
router.get(
  '/me',
  authenticate,
  requireRole('author'),
  articleController.getMyArticles.bind(articleController)
);

/**
 * @openapi
 * /api/articles/{id}:
 *   get:
 *     tags:
 *       - Articles (Public)
 *     summary: Get a single article by ID (triggers read tracking)
 *     description: Returns full article content. Creates a ReadLog entry (non-blocking). Rate-limited to 1 log per 30 seconds per user/IP per article.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Article details
 *       410:
 *         description: Article no longer available (deleted)
 *       404:
 *         description: Article not found
 */
router.get(
  '/:id',
  optionalAuthenticate,
  readEventRateLimiter,
  articleController.getById.bind(articleController)
);

/**
 * @openapi
 * /api/articles:
 *   post:
 *     tags:
 *       - Articles (Author)
 *     summary: Create a new article (Author only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ArticleCreate'
 *     responses:
 *       201:
 *         description: Article created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not an author)
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  requireRole('author'),
  validate(createArticleSchema),
  articleController.create.bind(articleController)
);

/**
 * @openapi
 * /api/articles/{id}:
 *   put:
 *     tags:
 *       - Articles (Author)
 *     summary: Update an article (Author only, own articles)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ArticleUpdate'
 *     responses:
 *       200:
 *         description: Article updated
 *       403:
 *         description: Forbidden (not the author or wrong role)
 *       404:
 *         description: Article not found
 */
router.put(
  '/:id',
  authenticate,
  requireRole('author'),
  validate(updateArticleSchema),
  articleController.update.bind(articleController)
);

/**
 * @openapi
 * /api/articles/{id}:
 *   delete:
 *     tags:
 *       - Articles (Author)
 *     summary: Soft-delete an article (Author only, own articles)
 *     description: Does NOT remove the record. Sets DeletedAt to current timestamp.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Article soft-deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('author'),
  articleController.softDelete.bind(articleController)
);

export default router;