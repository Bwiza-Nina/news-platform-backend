import request from 'supertest';
import { app } from '../index';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

// Get the mocked prisma instance
const prisma = new PrismaClient() as any;

// Mock argon2
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('$argon2id$hashed'),
  verify: jest.fn().mockResolvedValue(true),
}));

// Mock analytics queue to avoid Redis connection
jest.mock('../src/jobs/analytics.queue', () => ({
  analyticsQueue: { add: jest.fn() },
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/signup', () => {
  it('should create a new user successfully', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'uuid-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'author',
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'StrongPass@1',
        role: 'author',
      });

    expect(res.status).toBe(201);
    expect(res.body.Success).toBe(true);
    expect(res.body.Object).toHaveProperty('email', 'john@example.com');
  });

  it('should return 409 when email is already in use', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'existing-uuid',
      email: 'john@example.com',
    });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'StrongPass@1',
        role: 'author',
      });

    expect(res.status).toBe(409);
    expect(res.body.Success).toBe(false);
    expect(res.body.Errors).toContain('Email is already in use');
  });

  it('should return 422 for weak password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak',
        role: 'author',
      });

    expect(res.status).toBe(422);
    expect(res.body.Success).toBe(false);
    expect(res.body.Errors).toBeDefined();
  });

  it('should return 422 when name contains digits', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'John123',
        email: 'john@example.com',
        password: 'StrongPass@1',
        role: 'author',
      });

    expect(res.status).toBe(422);
    expect(res.body.Success).toBe(false);
  });

  it('should return 422 for invalid role', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'StrongPass@1',
        role: 'admin',
      });

    expect(res.status).toBe(422);
    expect(res.body.Success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  it('should login successfully and return a JWT token', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'uuid-1',
      name: 'John Doe',
      email: 'john@example.com',
      password: '$argon2id$hashed',
      role: 'author',
    });

    (argon2.verify as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'StrongPass@1' });

    expect(res.status).toBe(200);
    expect(res.body.Success).toBe(true);
    expect(res.body.Object).toHaveProperty('token');
    expect(res.body.Object.user.role).toBe('author');
  });

  it('should return 401 for invalid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.Success).toBe(false);
  });

  it('should return 401 when password does not match', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'uuid-1',
      email: 'john@example.com',
      password: '$argon2id$hashed',
      role: 'author',
    });
    (argon2.verify as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'WrongPass@1' });

    expect(res.status).toBe(401);
    expect(res.body.Success).toBe(false);
  });
});