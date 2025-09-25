// Test setup and mocks
import { jest } from '@jest/globals';

// Mock all external dependencies
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    end: jest.fn(),
    totalCount: 10,
    idleCount: 8
  }))
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    mget: jest.fn(),
    keys: jest.fn(),
    llen: jest.fn(),
    pipeline: jest.fn(() => ({
      setex: jest.fn(),
      exec: jest.fn()
    })),
    ping: jest.fn(() => Promise.resolve('PONG')),
    info: jest.fn(() => Promise.resolve('used_memory:1048576\nused_memory_peak:2097152')),
    dbsize: jest.fn(() => Promise.resolve(100)),
    quit: jest.fn(),
    status: 'ready'
  }));
});

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn()
  })),
  isAxiosError: jest.fn((error: any) => error && error.response)
}));

// Mock global fetch
(global as any).fetch = jest.fn();

// Mock process.memoryUsage
const originalMemoryUsage = process.memoryUsage;
process.memoryUsage = jest.fn(() => ({
  heapUsed: 100 * 1024 * 1024, // 100MB
  heapTotal: 1000 * 1024 * 1024,
  external: 0,
  rss: 1000 * 1024 * 1024,
  arrayBuffers: 0
})) as any;

// Mock os.totalmem
jest.mock('os', () => ({
  totalmem: jest.fn(() => 1000 * 1024 * 1024), // 1GB
  cpus: jest.fn(() => [
    { times: { user: 1000, nice: 0, sys: 1000, idle: 8000, irq: 0 } }
  ]),
  loadavg: jest.fn(() => [0.5, 0.8, 1.2])
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Restore original functions after all tests
afterAll(() => {
  process.memoryUsage = originalMemoryUsage;
});
