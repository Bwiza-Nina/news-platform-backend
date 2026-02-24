// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';