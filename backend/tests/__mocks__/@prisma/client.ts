// Auto-mock Prisma client for unit tests
const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  article: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  readLog: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  dailyAnalytics: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

const PrismaClient = jest.fn(() => mockPrismaClient);
const Role = { author: 'author', reader: 'reader' };
const ArticleStatus = { Draft: 'Draft', Published: 'Published' };

module.exports = { PrismaClient, Role, ArticleStatus };