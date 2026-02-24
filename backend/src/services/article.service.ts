import { prisma } from '../config/database';
import { CreateArticleInput, UpdateArticleInput } from '../validators/article.validator';
import { ArticleQuery } from '../types';
import { getPagination } from '../utils/pagination';
import { analyticsQueue } from '../jobs/analytics.queue';

export class ArticleService {
  async create(data: CreateArticleInput, authorId: string) {
    return prisma.article.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category,
        status: data.status as 'Draft' | 'Published',
        authorId,
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  }

  async getMyArticles(authorId: string, query: ArticleQuery) {
    const { page, size, skip } = getPagination(query.page, query.size);
    const showDeleted = query.includeDeleted === 'true';

    const where: any = { authorId };
    if (!showDeleted) where.deletedAt = null;

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, name: true } } },
      }),
      prisma.article.count({ where }),
    ]);

    // Mark deleted ones
    const mapped = articles.map((a) => ({
      ...a,
      isDeleted: a.deletedAt !== null,
    }));

    return { articles: mapped, page, size, total };
  }

  async update(articleId: string, authorId: string, data: UpdateArticleInput) {
    const article = await prisma.article.findFirst({
      where: { id: articleId, deletedAt: null },
    });

    if (!article) throw { status: 404, message: 'Article not found' };
    if (article.authorId !== authorId) throw { status: 403, message: 'Forbidden' };

    return prisma.article.update({
      where: { id: articleId },
      data,
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async softDelete(articleId: string, authorId: string) {
    const article = await prisma.article.findFirst({
      where: { id: articleId, deletedAt: null },
    });

    if (!article) throw { status: 404, message: 'Article not found' };
    if (article.authorId !== authorId) throw { status: 403, message: 'Forbidden' };

    return prisma.article.update({
      where: { id: articleId },
      data: { deletedAt: new Date() },
    });
  }

  async getPublicFeed(query: ArticleQuery) {
    const { page, size, skip } = getPagination(query.page, query.size);

    const where: any = {
      status: 'Published',
      deletedAt: null,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.author) {
      where.author = {
        name: { contains: query.author, mode: 'insensitive' },
      };
    }

    if (query.q) {
      where.title = { contains: query.q, mode: 'insensitive' };
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, name: true } } },
      }),
      prisma.article.count({ where }),
    ]);

    return { articles, page, size, total };
  }

  async getById(articleId: string, readerId?: string, skipReadLog = false) {
    const article = await prisma.article.findFirst({
      where: { id: articleId },
      include: { author: { select: { id: true, name: true } } },
    });

    if (!article) throw { status: 404, message: 'Article not found' };
    if (article.deletedAt) throw { status: 410, message: 'News article no longer available' };

    // Non-blocking: fire-and-forget read log creation
    if (!skipReadLog) {
      setImmediate(async () => {
        try {
          await prisma.readLog.create({
            data: {
              articleId,
              readerId: readerId || null,
            },
          });

          // Queue analytics job for today's aggregation
          await analyticsQueue.add(
            'aggregate-reads',
            { articleId, date: new Date().toISOString().split('T')[0] },
            {
              jobId: `analytics:${articleId}:${new Date().toISOString().split('T')[0]}`,
              removeOnComplete: true,
              removeOnFail: false,
            }
          );
        } catch (err) {
          // Silently log – never block the response
          console.error('ReadLog creation failed:', err);
        }
      });
    }

    return article;
  }

  async getDashboard(authorId: string, query: ArticleQuery) {
    const { page, size, skip } = getPagination(query.page, query.size);

    const where = { authorId, deletedAt: null };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
        include: {
          dailyAnalytics: {
            select: { viewCount: true },
          },
        },
      }),
      prisma.article.count({ where }),
    ]);

    const mapped = articles.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      status: a.status,
      createdAt: a.createdAt,
      TotalViews: a.dailyAnalytics.reduce((sum, d) => sum + d.viewCount, 0),
    }));

    return { articles: mapped, page, size, total };
  }
}

export const articleService = new ArticleService();