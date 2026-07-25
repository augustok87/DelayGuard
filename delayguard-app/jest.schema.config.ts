import type { Config } from 'jest';

/**
 * Jest config for the real-database schema suite (`npm run test:db:schema`).
 *
 * The base jest.config.ts maps `pg` to `__mocks__/pg.js` via moduleNameMapper,
 * which `jest.unmock('pg')` CANNOT override — moduleNameMapper wins before the
 * module registry is consulted. The schema suites therefore silently ran
 * against the mock (COUNT(*) always "0") and failed. This config drops the pg
 * mapping so the suites hit a real local PostgreSQL, and runs in a plain node
 * environment (no jsdom, no global env stubs from tests/setup/jest.setup.ts —
 * that file forces DATABASE_URL to a nonexistent test:test role).
 *
 * Prerequisites: local PostgreSQL with `delayguard_dev` and `delayguard_test`
 * databases (the suites run the idempotent runMigrations() themselves).
 * Discovered/fixed during LAUNCH_PLAN WS-D (D1).
 */
const config: Config = {
  testEnvironment: 'node',

  testMatch: ['**/*-schema.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],

  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // NOTE: no `^pg$` mapping here — schema tests need the real driver.
    // ioredis stays mocked; no schema test touches Redis.
    '^ioredis$': '<rootDir>/__mocks__/ioredis.js',
  },

  automock: false,

  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      useESM: false,
    }],
  },

  collectCoverage: false,

  testTimeout: 15000,
  maxWorkers: 1,

  roots: ['<rootDir>/src', '<rootDir>/tests'],
};

export default config;
