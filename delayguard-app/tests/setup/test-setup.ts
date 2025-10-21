// Test setup and mocks
import { jest } from '@jest/globals';

// Mock all external dependencies
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn<any>().mockResolvedValue({ rows: [{ count: '10' }] }),
    end: jest.fn<any>(),
    totalCount: 10,
    idleCount: 8,
  })),
}));

jest.mock('ioredis', () => {
  const MockRedis = jest.fn<any>().mockImplementation(() => ({
    get: jest.fn<any>().mockResolvedValue(null),
    setex: jest.fn<any>().mockResolvedValue('OK'),
    del: jest.fn<any>().mockResolvedValue(1),
    mget: jest.fn<any>().mockResolvedValue([null, null]),
    keys: jest.fn<any>().mockResolvedValue([]),
    llen: jest.fn<any>().mockResolvedValue(0),
    pipeline: jest.fn<any>(() => ({
      setex: jest.fn<any>().mockReturnThis(),
      exec: jest.fn<any>().mockResolvedValue([['OK'], ['OK']]),
    })),
    ping: jest.fn<any>().mockResolvedValue('PONG'),
    info: jest.fn<any>().mockResolvedValue('used_memory:1048576\nused_memory_peak:2097152'),
    dbsize: jest.fn<any>().mockResolvedValue(100),
    quit: jest.fn<any>().mockResolvedValue('OK'),
    status: 'ready',
  }));
  
  return {
    Redis: MockRedis,
    default: MockRedis,
  };
});

jest.mock('axios', () => ({
  create: jest.fn<any>(() => ({
    get: jest.fn<any>(),
  })),
  isAxiosError: jest.fn<any>((error: any) => error && error.response),
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
  arrayBuffers: 0,
})) as any;

// Mock os.totalmem
jest.mock('os', () => ({
  totalmem: jest.fn(() => 1000 * 1024 * 1024), // 1GB
  freemem: jest.fn(() => 500 * 1024 * 1024), // 500MB
  cpus: jest.fn(() => [
    { times: { user: 1000, nice: 0, sys: 1000, idle: 8000, irq: 0 } },
  ]),
  loadavg: jest.fn(() => [0.5, 0.8, 1.2]),
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Restore original functions after all tests
afterAll(() => {
  process.memoryUsage = originalMemoryUsage;
});
