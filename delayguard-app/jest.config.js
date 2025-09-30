module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/__tests__/**/*.tsx',
    '**/?(*.)+(spec|test).ts',
    '**/?(*.)+(spec|test).tsx'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/database/**/*',
    '!src/queue/**/*',
    '!src/routes/**/*',
    '!src/services/**/*',
    '!src/utils/**/*',
    '!src/**/__tests__/**/*',
    '!src/**/*.test.*',
    '!src/**/*.spec.*',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  testTimeout: 10000,
  maxWorkers: 1,
  verbose: true,
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};