// @ts-nocheck
// Test setup and mocks
import { jest } from '@jest/globals';

// Mock all external dependencies
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({ rows: [{ count: '10' }] }),
    end: jest.fn(),
    totalCount: 10,
    idleCount: 8
  }))
}));

jest.mock('ioredis', () => {
  const MockRedis = jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    mget: jest.fn().mockResolvedValue([null, null]),
    keys: jest.fn().mockResolvedValue([]),
    llen: jest.fn().mockResolvedValue(0),
    pipeline: jest.fn(() => ({
      setex: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([['OK'], ['OK']])
    })),
    ping: jest.fn().mockResolvedValue('PONG'),
    info: jest.fn().mockResolvedValue('used_memory:1048576\nused_memory_peak:2097152'),
    dbsize: jest.fn().mockResolvedValue(100),
    quit: jest.fn().mockResolvedValue('OK'),
    status: 'ready'
  }));
  
  return {
    Redis: MockRedis,
    default: MockRedis
  };
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
  freemem: jest.fn(() => 500 * 1024 * 1024), // 500MB
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
