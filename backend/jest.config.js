module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@prisma/client$': '<rootDir>/tests/__mocks__/@prisma/client.ts',
  },
  setupFiles: ['<rootDir>/tests/setup.ts'],
  globals: {
    'ts-jest': {
      tsconfig: {
        strict: false,
      },
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/config/swagger.ts',
    '!src/utils/logger.ts',
  ],
};