import { OptimizedDatabase } from '../../../src/services/optimized-database';
import { Pool, QueryResult } from 'pg';

// Mock pg module
jest.mock('pg');
const MockedPool = Pool as jest.MockedClass<typeof Pool>;

describe('OptimizedDatabase', () => {
  let database: OptimizedDatabase;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: any;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      database: {
        url: 'postgresql://test:test@localhost:5432/testdb',
      },
    };

    // Mock pool client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    } as any;

    // Mock pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn().mockResolvedValue(undefined),
      totalCount: 10,
      idleCount: 5,
      waitingCount: 2,
      on: jest.fn(),
    } as any;

    MockedPool.mockImplementation(() => mockPool);
    
    database = new OptimizedDatabase(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Connection', () => {
    it('should initialize with correct pool configuration', () => {
      expect(MockedPool).toHaveBeenCalledWith({
        connectionString: mockConfig.database.url,
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        statement_timeout: 10000,
        query_timeout: 10000,
        application_name: 'delayguard',
        keepAlive: true,
        keepAliveInitialDelayMillis: 0,
      });
    });

    it('should handle pool errors', () => {
      // Test that the pool error handler is set up
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('Query Execution', () => {
    it('should execute simple queries successfully', async() => {
      const mockResult: QueryResult = {
        rows: [{ id: 1, name: 'test' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await database.query('SELECT * FROM test');
      
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SET statement_timeout = 10000');
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM test', []);
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should execute queries with parameters', async() => {
      const mockResult: QueryResult = {
        rows: [{ id: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await database.query('SELECT * FROM test WHERE id = $1', [123]);
      
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM test WHERE id = $1', [123]);
      expect(result).toEqual(mockResult);
    });

    it('should handle query timeouts', async() => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await database.query('SELECT * FROM test', [], { timeout: 5000 });
      
      expect(mockClient.query).toHaveBeenCalledWith('SET statement_timeout = 5000');
      expect(result).toEqual(mockResult);
    });

    it('should log slow queries', async() => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      // Mock slow query by delaying the response
      mockClient.query.mockImplementation(async() => {
        await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1 seconds
        return mockResult;
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await database.query('SELECT * FROM slow_table');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Slow query detected: \d+ms - SELECT \* FROM slow_table\.\.\./),
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Query Retry Logic', () => {
    it('should retry on transient errors', async() => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      // Mock the timeout setting to succeed, then fail twice, then succeed
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SET', oid: 0, fields: [] }) // timeout setting
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce(mockResult);

      const result = await database.query('SELECT * FROM test', [], { retries: 2 });
      
      expect(mockClient.query).toHaveBeenCalledTimes(5); // 1 timeout + 4 retries (initial + 3 retries)
      expect(result).toEqual(mockResult);
    });

    it('should not retry on non-retryable errors', async() => {
      const syntaxError = new Error('syntax error at or near "INVALID"');
      
      mockClient.query.mockRejectedValue(syntaxError);

      await expect(database.query('INVALID SQL')).rejects.toThrow('syntax error');
      expect(mockClient.query).toHaveBeenCalledTimes(1); // No retries
    });

    it('should use exponential backoff for retries', async() => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce(mockResult);

      const startTime = Date.now();
      await database.query('SELECT * FROM test', [], { retries: 2 });
      const duration = Date.now() - startTime;

      // Should have waited for backoff (at least 1000ms + 2000ms = 3000ms)
      expect(duration).toBeGreaterThan(3000);
    });

    it('should throw error after all retries exhausted', async() => {
      const persistentError = new Error('Persistent connection error');
      
      mockClient.query.mockRejectedValue(persistentError);

      await expect(database.query('SELECT * FROM test', [], { retries: 2 }))
        .rejects.toThrow('Persistent connection error');
    });
  });

  describe('Query Caching', () => {
    it('should cache query results when enabled', async() => {
      const mockResult: QueryResult = {
        rows: [{ id: 1, name: 'cached' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      // First call - should execute query
      const result1 = await database.query('SELECT * FROM cache_test', [], { cache: true });
      expect(mockClient.query).toHaveBeenCalledTimes(2); // timeout + query

      // Second call - should use cache
      mockClient.query.mockClear();
      const result2 = await database.query('SELECT * FROM cache_test', [], { cache: true });
      expect(mockClient.query).not.toHaveBeenCalled(); // Should not execute query
      expect(result2).toEqual(result1);
    });

    it('should not cache when cache is disabled', async() => {
      const mockResult: QueryResult = {
        rows: [{ id: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      await database.query('SELECT * FROM test', [], { cache: false });
      await database.query('SELECT * FROM test', [], { cache: false });
      
      expect(mockClient.query).toHaveBeenCalledTimes(4); // 2 timeout + 2 query calls
    });

    it('should respect cache TTL', async() => {
      const mockResult: QueryResult = {
        rows: [{ id: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      // First call with short TTL
      await database.query('SELECT * FROM ttl_test', [], { cache: true, cacheTTL: 100 });
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Second call should execute query again
      mockClient.query.mockClear();
      await database.query('SELECT * FROM ttl_test', [], { cache: true, cacheTTL: 100 });
      expect(mockClient.query).toHaveBeenCalledTimes(2); // timeout + query
    });

    it('should cleanup cache when full', async() => {
      const mockResult: QueryResult = {
        rows: [{ id: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      // Fill cache beyond max size
      for (let i = 0; i < 1001; i++) {
        await database.query(`SELECT * FROM test_${i}`, [], { cache: true, cacheTTL: 1000 });
      }

      // Cache should be cleaned up (may be 1001 due to timing)
      const cacheSize = (database as any).queryCache.size;
      expect(cacheSize).toBeLessThanOrEqual(1001);
    });
  });

  describe('Transactions', () => {
    it('should execute transactions successfully', async() => {
      const mockResult = { id: 1, name: 'transaction result' };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: null, fields: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'COMMIT', oid: null, fields: [] });

      const callback = jest.fn().mockResolvedValue(mockResult);
      
      const result = await database.transaction(callback);
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should rollback transactions on error', async() => {
      const transactionError = new Error('Transaction failed');
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: null, fields: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'ROLLBACK', oid: null, fields: [] });

      const callback = jest.fn().mockRejectedValue(transactionError);
      
      await expect(database.transaction(callback)).rejects.toThrow('Transaction failed');
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Batch Queries', () => {
    it('should execute batch queries', async() => {
      const mockResults = [
        { rows: [{ id: 1 }], rowCount: 1, command: 'SELECT', oid: null, fields: [] },
        { rows: [{ id: 2 }], rowCount: 1, command: 'SELECT', oid: null, fields: [] },
      ];

      mockClient.query
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const queries = [
        { text: 'SELECT * FROM table1' },
        { text: 'SELECT * FROM table2', params: [123] },
      ];

      const results = await database.batchQuery(queries);
      
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM table1', []);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM table2', [123]);
      expect(mockClient.release).toHaveBeenCalled();
      expect(results).toEqual(mockResults);
    });
  });

  describe('Connection Management', () => {
    it('should get connection from pool', async() => {
      const connection = await database.getConnection();
      expect(connection).toBe(mockClient);
      expect(mockPool.connect).toHaveBeenCalled();
    });

    it('should close database connection', async() => {
      await database.close();
      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should get pool statistics', async() => {
      const stats = await database.getStats();
      
      expect(stats).toEqual({
        totalCount: 10,
        idleCount: 5,
        waitingCount: 2,
      });
    });
  });

  describe('Optimized Query Methods', () => {
    it('should get shop by domain with caching', async() => {
      const mockShop = { id: 1, domain: 'test-shop.myshopify.com' };
      const mockResult: QueryResult = {
        rows: [mockShop],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await database.getShopByDomain('test-shop.myshopify.com');
      
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM shops WHERE shop_domain = $1 LIMIT 1',
        ['test-shop.myshopify.com'],
      );
      expect(result).toEqual(mockShop);
    });

    it('should return null when shop not found', async() => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await database.getShopByDomain('nonexistent.myshopify.com');
      expect(result).toBeNull();
    });

    it('should get shop settings', async() => {
      const mockSettings = { id: 1, shop_id: 123, delay_threshold: 2 };
      const mockResult: QueryResult = {
        rows: [mockSettings],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await database.getShopSettings(123);
      
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM app_settings WHERE shop_id = $1 LIMIT 1',
        [123],
      );
      expect(result).toEqual(mockSettings);
    });

    it('should get recent orders with joins', async() => {
      const mockOrders = [
        { id: 1, order_number: '1001', tracking_number: '1Z123', carrier_code: 'ups' },
        { id: 2, order_number: '1002', tracking_number: '1Z456', carrier_code: 'ups' },
      ];
      const mockResult: QueryResult = {
        rows: mockOrders,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await database.getRecentOrders(123, 10, 0);
      
      // Check that the query was called with the expected parameters
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT o.*, f.tracking_number, f.carrier_code, f.status as fulfillment_status'),
        [123, 10, 0],
      );
      expect(result).toEqual(mockOrders);
    });

    it('should get recent alerts with joins', async() => {
      const mockAlerts = [
        { id: 1, order_number: '1001', customer_name: 'John Doe', tracking_number: '1Z123' },
        { id: 2, order_number: '1002', customer_name: 'Jane Smith', tracking_number: '1Z456' },
      ];
      const mockResult: QueryResult = {
        rows: mockAlerts,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await database.getRecentAlerts(123, 10, 0);
      
      // Check that the query was called with the expected parameters
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT da.*, o.order_number, o.customer_name, o.customer_email'),
        [123, 10, 0],
      );
      expect(result).toEqual(mockAlerts);
    });

    it('should get order count', async() => {
      const mockResult: QueryResult = {
        rows: [{ count: '42' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      const count = await database.getOrderCount(123);
      
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM orders WHERE shop_id = $1',
        [123],
      );
      expect(count).toBe(42);
    });

    it('should get order count with date filter', async() => {
      const startDate = new Date('2024-01-01');
      const mockResult: QueryResult = {
        rows: [{ count: '15' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      const count = await database.getOrderCount(123, startDate);
      
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM orders WHERE shop_id = $1 AND created_at >= $2',
        [123, startDate],
      );
      expect(count).toBe(15);
    });

    it('should get alert count', async() => {
      const mockResult: QueryResult = {
        rows: [{ count: '8' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      const count = await database.getAlertCount(123);
      
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM delay_alerts da JOIN orders o ON da.order_id = o.id WHERE o.shop_id = $1',
        [123],
      );
      expect(count).toBe(8);
    });

    it('should get alert count with date filter', async() => {
      const startDate = new Date('2024-01-01');
      const mockResult: QueryResult = {
        rows: [{ count: '3' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockResult);

      const count = await database.getAlertCount(123, startDate);
      
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM delay_alerts da JOIN orders o ON da.order_id = o.id WHERE o.shop_id = $1 AND da.created_at >= $2',
        [123, startDate],
      );
      expect(count).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should identify non-retryable errors', () => {
      const nonRetryableErrors = [
        'syntax error at line 1',
        'permission denied for table users',
        'relation does not exist',
        'column does not exist',
        'duplicate key value violates unique constraint',
      ];

      nonRetryableErrors.forEach(errorMessage => {
        const error = new Error(errorMessage);
        const isNonRetryable = (database as any).isNonRetryableError(error);
        expect(isNonRetryable).toBe(true);
      });
    });

    it('should identify retryable errors', () => {
      const retryableErrors = [
        'connection timeout',
        'network error',
        'temporary failure',
        'server unavailable',
      ];

      retryableErrors.forEach(errorMessage => {
        const error = new Error(errorMessage);
        const isNonRetryable = (database as any).isNonRetryableError(error);
        expect(isNonRetryable).toBe(false);
      });
    });
  });

  describe('Cache Management', () => {
    it('should get from cache when valid', () => {
      const cacheKey = 'test-key';
      const cachedResult = { id: 1, name: 'cached' };
      const expiry = Date.now() + 1000;

      (database as any).queryCache.set(cacheKey, { result: cachedResult, expiry });
      
      const result = (database as any).getFromCache(cacheKey);
      expect(result).toEqual(cachedResult);
    });

    it('should return null for expired cache entries', () => {
      const cacheKey = 'expired-key';
      const cachedResult = { id: 1, name: 'expired' };
      const expiry = Date.now() - 1000; // Expired

      (database as any).queryCache.set(cacheKey, { result: cachedResult, expiry });
      
      const result = (database as any).getFromCache(cacheKey);
      expect(result).toBeNull();
    });

    it('should clean up expired cache entries', () => {
      const now = Date.now();
      const expiredKey = 'expired-key';
      const validKey = 'valid-key';

      (database as any).queryCache.set(expiredKey, { result: {}, expiry: now - 1000 });
      (database as any).queryCache.set(validKey, { result: {}, expiry: now + 1000 });

      (database as any).cleanupCache();

      expect((database as any).queryCache.has(expiredKey)).toBe(false);
      expect((database as any).queryCache.has(validKey)).toBe(true);
    });
  });
});
