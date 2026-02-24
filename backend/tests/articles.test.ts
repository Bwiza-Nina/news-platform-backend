import request from 'supertest';
import { app } from '../index';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as any;

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('$hashed'),
  verify: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/jobs/analytics.queue', () => ({
  analyticsQueue: { add: jest.fn().mockResolvedValue({}) },
  startAnalyticsWorker: jest.fn(),
}));

jest.mock('../src/config/redis', () => ({
  redis: { on: jest.fn(), connect: jest.fn() },
  connectRedis: jest.fn(),
}));

jest.mock('../src/config/database', () => ({
  prisma: new (require('@prisma/client').PrismaClient)(),
  connectDatabase: jest.fn(),
}));

// Helper: generate test JWT
const makeToken = (role: 'author' | 'reader', userId = 'user-uuid-1') =>
  jwt.sign({ sub: userId, role }, process.env.JWT_SECRET || 'test-secret-key-for-jest');

const authorToken = makeToken('author', 'author-uuid-1');
const readerToken = makeToken('reader', 'reader-uuid-1');

const mockArticle = {
  id: 'article-uuid-1',
  title: 'Test Article Title',
  content: 'This is a test article with more than fifty characters of content for validation.',
  category: 'Tech',
  status: 'Published',
  authorId: 'author-uuid-1',
  createdAt: new Date(),
  deletedAt: null,
  author: { id: 'author-uuid-1', name: 'Jane Doe' },
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Public Feed ──────────────────────────────────────────────────────────────
describe('GET /api/articles (Public Feed)', () => {
  it('should return paginated published articles', async () => {
    prisma.article.findMany.mockResolvedValue([mockArticle]);
    prisma.article.count.mockResolvedValue(1);

    const res = await request(app).get('/api/articles');

    expect(res.status).toBe(200);
    expect(res.body.Success).toBe(true);
    expect(res.body.Object).toHaveLength(1);
    expect(res.body.PageNumber).toBe(1);
    expect(res.body.TotalSize).toBe(1);
  });

  it('should filter by category', async () => {
    prisma.article.findMany.mockResolvedValue([mockArticle]);
    prisma.article.count.mockResolvedValue(1);

    const res = await request(app).get('/api/articles?category=Tech');
    expect(res.status).toBe(200);
    expect(res.body.Success).toBe(true);
  });

  it('should support keyword search in title', async () => {
    prisma.article.findMany.mockResolvedValue([]);
    prisma.article.count.mockResolvedValue(0);

    const res = await request(app).get('/api/articles?q=nonexistent');
    expect(res.status).toBe(200);
    expect(res.body.Object).toHaveLength(0);
    expect(res.body.TotalSize).toBe(0);
  });
});

// ─── Get Article By ID ────────────────────────────────────────────────────────
describe('GET /api/articles/:id', () => {
  it('should return article and trigger read log (non-blocking)', async () => {
    prisma.article.findFirst.mockResolvedValue(mockArticle);
    prisma.readLog.create.mockResolvedValue({ id: 'log-1' });

    const res = await request(app).get('/api/articles/article-uuid-1');
    expect(res.status).toBe(200);
    expect(res.body.Success).toBe(true);
    expect(res.body.Object.id).toBe('article-uuid-1');
  });

  it('should return 410 when article is soft-deleted', async () => {
    prisma.article.findFirst.mockResolvedValue({
      ...mockArticle,
      deletedAt: new Date(),
    });

    const res = await request(app).get('/api/articles/article-uuid-1');
    expect(res.status).toBe(410);
    expect(res.body.Success).toBe(false);
    expect(res.body.Message).toBe('News article no longer available');
  });

  it('should return 404 when article does not exist', async () => {
    prisma.article.findFirst.mockResolvedValue(null);

    const res = await request(app).get('/api/articles/nonexistent-id');
    expect(res.status).toBe(404);
    expect(res.body.Success).toBe(false);
  });
});

// ─── Create Article ───────────────────────────────────────────────────────────
describe('POST /api/articles (Author Only)', () => {
  it('should create article successfully as author', async () => {
    prisma.article.create.mockResolvedValue(mockArticle);

    const res = await request(app)
      .post('/api/articles')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: 'Test Article Title',
        content: 'This is content with more than fifty characters for validation purposes.',
        category: 'Tech',
        status: 'Draft',
      });

    expect(res.status).toBe(201);
    expect(res.body.Success).toBe(true);
  });

  it('should return 401 without token', async () => {
    const res = await request(app)
      .post('/api/articles')
      .send({ title: 'Test', content: 'Content...', category: 'Tech' });

    expect(res.status).toBe(401);
  });

  it('should return 403 when reader tries to create article', async () => {
    const res = await request(app)
      .post('/api/articles')
      .set('Authorization', `Bearer ${readerToken}`)
      .send({
        title: 'Test',
        content: 'This is content with more than fifty characters for validation.',
        category: 'Tech',
      });

    expect(res.status).toBe(403);
  });

  it('should return 422 when title exceeds 150 characters', async () => {
    const res = await request(app)
      .post('/api/articles')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: 'A'.repeat(151),
        content: 'Valid content with more than fifty characters for the validation test.',
        category: 'Tech',
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 when content is less than 50 characters', async () => {
    const res = await request(app)
      .post('/api/articles')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ title: 'Valid Title', content: 'Too short', category: 'Tech' });

    expect(res.status).toBe(422);
  });
});

// ─── Update Article ───────────────────────────────────────────────────────────
describe('PUT /api/articles/:id (Author Only)', () => {
  it('should update own article successfully', async () => {
    prisma.article.findFirst.mockResolvedValue(mockArticle);
    prisma.article.update.mockResolvedValue({ ...mockArticle, title: 'Updated Title' });

    const res = await request(app)
      .put('/api/articles/article-uuid-1')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.Success).toBe(true);
  });

  it('should return 403 when trying to edit another author\'s article', async () => {
    prisma.article.findFirst.mockResolvedValue({
      ...mockArticle,
      authorId: 'different-author-uuid',
    });

    const res = await request(app)
      .put('/api/articles/article-uuid-1')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ title: 'Hacked Title' });

    expect(res.status).toBe(403);
    expect(res.body.Success).toBe(false);
  });
});

// ─── Soft Delete ──────────────────────────────────────────────────────────────
describe('DELETE /api/articles/:id (Soft Delete)', () => {
  it('should soft-delete own article', async () => {
    prisma.article.findFirst.mockResolvedValue(mockArticle);
    prisma.article.update.mockResolvedValue({ ...mockArticle, deletedAt: new Date() });

    const res = await request(app)
      .delete('/api/articles/article-uuid-1')
      .set('Authorization', `Bearer ${authorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.Success).toBe(true);
    // Verify it's a soft delete (update called, not delete)
    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
    expect(prisma.article.delete).not.toHaveBeenCalled();
  });

  it('should return 403 when deleting another author\'s article', async () => {
    prisma.article.findFirst.mockResolvedValue({
      ...mockArticle,
      authorId: 'someone-else',
    });

    const res = await request(app)
      .delete('/api/articles/article-uuid-1')
      .set('Authorization', `Bearer ${authorToken}`);

    expect(res.status).toBe(403);
  });
});

// ─── My Articles ──────────────────────────────────────────────────────────────
describe('GET /api/articles/me (Author Only)', () => {
  it('should return author\'s articles including drafts', async () => {
    const draft = { ...mockArticle, status: 'Draft' };
    prisma.article.findMany.mockResolvedValue([mockArticle, draft]);
    prisma.article.count.mockResolvedValue(2);

    const res = await request(app)
      .get('/api/articles/me')
      .set('Authorization', `Bearer ${authorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.Success).toBe(true);
    expect(res.body.TotalSize).toBe(2);
  });

  it('should return 403 for reader', async () => {
    const res = await request(app)
      .get('/api/articles/me')
      .set('Authorization', `Bearer ${readerToken}`);

    expect(res.status).toBe(403);
  });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
describe('GET /api/author/dashboard (Author Only)', () => {
  it('should return dashboard with TotalViews', async () => {
    prisma.article.findMany.mockResolvedValue([
      {
        ...mockArticle,
        dailyAnalytics: [{ viewCount: 50 }, { viewCount: 30 }],
      },
    ]);
    prisma.article.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/author/dashboard')
      .set('Authorization', `Bearer ${authorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.Success).toBe(true);
    expect(res.body.Object[0].TotalViews).toBe(80);
    expect(res.body.Object[0]).toHaveProperty('title');
    expect(res.body.Object[0]).toHaveProperty('createdAt');
  });
});