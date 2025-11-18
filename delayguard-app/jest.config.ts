import type { Config } from 'jest';

const config: Config = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Enable verbose output for better debugging
  verbose: true,
  
  // Define patterns to locate test files
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.tsx',
    '**/?(*.)+(spec|test).ts',
    '**/?(*.)+(spec|test).tsx'
  ],

  // Exclude database schema integration tests from default test run
  // These require a real PostgreSQL database and should be run separately with npm run test:db
  testPathIgnorePatterns: [
    '/node_modules/',
    '.*-schema\\.test\\.ts$'
  ],
  
  // Specify module file extensions for importing
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  
  // Configure module name mappings for handling CSS modules or other assets
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
    '^ioredis$': '<rootDir>/__mocks__/ioredis.js',
    '^pg$': '<rootDir>/__mocks__/pg.js'
  },
  
  // Enable automatic mocking of modules
  automock: false,
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      useESM: false,
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [['@babel/preset-env', { modules: 'commonjs' }]]
    }],
  },
  
  // Transform ESM modules from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(koa-session|uuid|msgpackr|bullmq|ioredis|@babel|@shopify)/)'
  ],
  
  // ESM support configuration
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Set up files to run before each test suite
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  
  // Collect code coverage information
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/database/**/*',
    '!src/queue/**/*',
    '!src/routes/**/*',
    '!src/**/__tests__/**/*',
    '!src/**/*.test.*',
    '!src/**/*.spec.*',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Test timeout
  testTimeout: 10000,
  
  // Max workers for parallel execution
  maxWorkers: 1,
  
  // Roots for test discovery
  roots: ['<rootDir>/src', '<rootDir>/tests'],
};

export default config;
