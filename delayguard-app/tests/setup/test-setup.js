"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
// Test setup and mocks
const globals_1 = require("@jest/globals");
// Mock all external dependencies
globals_1.jest.mock('pg', () => ({
    Pool: globals_1.jest.fn().mockImplementation(() => ({
        query: globals_1.jest.fn().mockResolvedValue({ rows: [{ count: '10' }] }),
        end: globals_1.jest.fn(),
        totalCount: 10,
        idleCount: 8
    }))
}));
globals_1.jest.mock('ioredis', () => {
    const MockRedis = globals_1.jest.fn().mockImplementation(() => ({
        get: globals_1.jest.fn().mockResolvedValue(null),
        setex: globals_1.jest.fn().mockResolvedValue('OK'),
        del: globals_1.jest.fn().mockResolvedValue(1),
        mget: globals_1.jest.fn().mockResolvedValue([null, null]),
        keys: globals_1.jest.fn().mockResolvedValue([]),
        llen: globals_1.jest.fn().mockResolvedValue(0),
        pipeline: globals_1.jest.fn(() => ({
            setex: globals_1.jest.fn().mockReturnThis(),
            exec: globals_1.jest.fn().mockResolvedValue([['OK'], ['OK']])
        })),
        ping: globals_1.jest.fn().mockResolvedValue('PONG'),
        info: globals_1.jest.fn().mockResolvedValue('used_memory:1048576\nused_memory_peak:2097152'),
        dbsize: globals_1.jest.fn().mockResolvedValue(100),
        quit: globals_1.jest.fn().mockResolvedValue('OK'),
        status: 'ready'
    }));
    return {
        Redis: MockRedis,
        default: MockRedis
    };
});
globals_1.jest.mock('axios', () => ({
    create: globals_1.jest.fn(() => ({
        get: globals_1.jest.fn()
    })),
    isAxiosError: globals_1.jest.fn((error) => error && error.response)
}));
// Mock global fetch
global.fetch = globals_1.jest.fn();
// Mock process.memoryUsage
const originalMemoryUsage = process.memoryUsage;
process.memoryUsage = globals_1.jest.fn(() => ({
    heapUsed: 100 * 1024 * 1024, // 100MB
    heapTotal: 1000 * 1024 * 1024,
    external: 0,
    rss: 1000 * 1024 * 1024,
    arrayBuffers: 0
}));
// Mock os.totalmem
globals_1.jest.mock('os', () => ({
    totalmem: globals_1.jest.fn(() => 1000 * 1024 * 1024), // 1GB
    freemem: globals_1.jest.fn(() => 500 * 1024 * 1024), // 500MB
    cpus: globals_1.jest.fn(() => [
        { times: { user: 1000, nice: 0, sys: 1000, idle: 8000, irq: 0 } }
    ]),
    loadavg: globals_1.jest.fn(() => [0.5, 0.8, 1.2])
}));
// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    info: globals_1.jest.fn()
};
// Clean up after each test
afterEach(() => {
    globals_1.jest.clearAllMocks();
});
// Restore original functions after all tests
afterAll(() => {
    process.memoryUsage = originalMemoryUsage;
});
//# sourceMappingURL=test-setup.js.map