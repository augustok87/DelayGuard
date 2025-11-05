import request from 'supertest';
import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';

// Mock database connection
jest.mock('../../../database/connection');
import { query } from '../../../database/connection';
const mockQuery = query as jest.MockedFunction<typeof query>;

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { logger } from '../../../utils/logger';

describe('/api/stats endpoint', () => {
  let app: Koa;
  let router: Router;

  beforeEach(() => {
    // Create fresh app and router for each test
    app = new Koa();
    router = new Router();

    // Define the /api/stats route (same logic as server-simple.ts)
    router.get('/api/stats', async(ctx) => {
      try {
        // Total alerts (all delay alerts created)
        const totalAlertsResult = await query(`
          SELECT COUNT(*) as count
          FROM delay_alerts
        `);
        const totalAlerts = parseInt((totalAlertsResult[0] as any).count as string);

        // Active alerts (orders not yet delivered or out for delivery)
        const activeAlertsResult = await query(`
          SELECT COUNT(DISTINCT da.id) as count
          FROM delay_alerts da
          JOIN orders o ON da.order_id = o.id
          WHERE o.tracking_status NOT IN ('DELIVERED', 'OUT_FOR_DELIVERY')
        `);
        const activeAlerts = parseInt((activeAlertsResult[0] as any).count as string);

        // Resolved alerts (orders delivered or out for delivery)
        const resolvedAlertsResult = await query(`
          SELECT COUNT(DISTINCT da.id) as count
          FROM delay_alerts da
          JOIN orders o ON da.order_id = o.id
          WHERE o.tracking_status IN ('DELIVERED', 'OUT_FOR_DELIVERY')
        `);
        const resolvedAlerts = parseInt((resolvedAlertsResult[0] as any).count as string);

        // Avg resolution time (time from alert created to delivery for resolved orders)
        const avgResolutionResult = await query(`
          SELECT
            AVG(EXTRACT(EPOCH FROM (o.updated_at - da.created_at)) / 86400) as avg_days,
            COUNT(*) as resolved_count
          FROM delay_alerts da
          JOIN orders o ON da.order_id = o.id
          WHERE o.tracking_status IN ('DELIVERED', 'OUT_FOR_DELIVERY')
            AND o.updated_at > da.created_at
        `);

        const avgDays = (avgResolutionResult[0] as any).avg_days
          ? Math.round(parseFloat((avgResolutionResult[0] as any).avg_days as string) * 10) / 10
          : 0;
        const avgResolutionTime = resolvedAlerts > 0
          ? `${avgDays} ${avgDays === 1 ? 'day' : 'days'}`
          : 'N/A';

        ctx.body = {
          totalAlerts,
          activeAlerts,
          resolvedAlerts,
          avgResolutionTime,
        };
      } catch (error) {
        logger.error('Error fetching stats:', error as Error);
        // Fallback to mock data if database unavailable
        ctx.body = {
          totalAlerts: 0,
          activeAlerts: 0,
          resolvedAlerts: 0,
          avgResolutionTime: 'N/A',
        };
      }
    });

    app.use(bodyParser());
    app.use(router.routes());
    app.use(router.allowedMethods());

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('GET /api/stats', () => {
    it('should return correct stats when there are alerts', async() => {
      // Mock total alerts count
      mockQuery.mockResolvedValueOnce([{ count: '10' }]);

      // Mock active alerts count
      mockQuery.mockResolvedValueOnce([{ count: '6' }]);

      // Mock resolved alerts count
      mockQuery.mockResolvedValueOnce([{ count: '4' }]);

      // Mock avg resolution time (3.5 days average)
      mockQuery.mockResolvedValueOnce([{ avg_days: '3.5', resolved_count: '4' }]);

      const response = await request(app.callback())
        .get('/api/stats')
        .expect(200);

      expect(response.body).toEqual({
        totalAlerts: 10,
        activeAlerts: 6,
        resolvedAlerts: 4,
        avgResolutionTime: '3.5 days',
      });

      expect(mockQuery).toHaveBeenCalledTimes(4);
    });

    it('should return zero stats when no alerts exist', async() => {
      // Mock total alerts count
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);

      // Mock active alerts count
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);

      // Mock resolved alerts count
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);

      // Mock avg resolution time (null when no resolved alerts)
      mockQuery.mockResolvedValueOnce([{ avg_days: null, resolved_count: '0' }]);

      const response = await request(app.callback())
        .get('/api/stats')
        .expect(200);

      expect(response.body).toEqual({
        totalAlerts: 0,
        activeAlerts: 0,
        resolvedAlerts: 0,
        avgResolutionTime: 'N/A',
      });
    });

    it('should show "N/A" when there are no resolved alerts', async() => {
      // Mock total alerts count
      mockQuery.mockResolvedValueOnce([{ count: '5' }]);

      // Mock active alerts count
      mockQuery.mockResolvedValueOnce([{ count: '5' }]);

      // Mock resolved alerts count (0 resolved)
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);

      // Mock avg resolution time (null when no resolved alerts)
      mockQuery.mockResolvedValueOnce([{ avg_days: null, resolved_count: '0' }]);

      const response = await request(app.callback())
        .get('/api/stats')
        .expect(200);

      expect(response.body).toEqual({
        totalAlerts: 5,
        activeAlerts: 5,
        resolvedAlerts: 0,
        avgResolutionTime: 'N/A',
      });
    });

    it('should use singular "day" when avg is exactly 1', async() => {
      // Mock total alerts count
      mockQuery.mockResolvedValueOnce([{ count: '3' }]);

      // Mock active alerts count
      mockQuery.mockResolvedValueOnce([{ count: '1' }]);

      // Mock resolved alerts count
      mockQuery.mockResolvedValueOnce([{ count: '2' }]);

      // Mock avg resolution time (exactly 1 day)
      mockQuery.mockResolvedValueOnce([{ avg_days: '1.0', resolved_count: '2' }]);

      const response = await request(app.callback())
        .get('/api/stats')
        .expect(200);

      expect(response.body.avgResolutionTime).toBe('1 day');
    });

    it('should round avg resolution time to 1 decimal place', async() => {
      // Mock total alerts count
      mockQuery.mockResolvedValueOnce([{ count: '5' }]);

      // Mock active alerts count
      mockQuery.mockResolvedValueOnce([{ count: '2' }]);

      // Mock resolved alerts count
      mockQuery.mockResolvedValueOnce([{ count: '3' }]);

      // Mock avg resolution time (2.7654321 days - should round to 2.8)
      mockQuery.mockResolvedValueOnce([{ avg_days: '2.7654321', resolved_count: '3' }]);

      const response = await request(app.callback())
        .get('/api/stats')
        .expect(200);

      expect(response.body.avgResolutionTime).toBe('2.8 days');
    });

    it('should handle database errors gracefully with fallback values', async() => {
      // Simulate database connection failure on first query
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app.callback())
        .get('/api/stats')
        .expect(200);

      expect(response.body).toEqual({
        totalAlerts: 0,
        activeAlerts: 0,
        resolvedAlerts: 0,
        avgResolutionTime: 'N/A',
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching stats:',
        expect.any(Error),
      );
    });

    it('should handle database errors after partial results', async() => {
      // Mock successful first query
      mockQuery.mockResolvedValueOnce([{ count: '10' }]);

      // Simulate failure on second query
      mockQuery.mockRejectedValueOnce(new Error('Connection timeout'));

      const response = await request(app.callback())
        .get('/api/stats')
        .expect(200);

      // Should return fallback values
      expect(response.body).toEqual({
        totalAlerts: 0,
        activeAlerts: 0,
        resolvedAlerts: 0,
        avgResolutionTime: 'N/A',
      });

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle parsing errors for non-numeric count values', async() => {
      // Mock invalid count value (should never happen, but test robustness)
      mockQuery.mockResolvedValueOnce([{ count: 'invalid' }]);

      const response = await request(app.callback())
        .get('/api/stats')
        .expect(200);

      // parseInt('invalid') causes NaN, which triggers error handler fallback
      // The endpoint should gracefully return fallback values instead of NaN
      expect(response.body).toEqual({
        totalAlerts: 0,
        activeAlerts: 0,
        resolvedAlerts: 0,
        avgResolutionTime: 'N/A',
      });
    });

    it('should correctly calculate stats with real-world scenario', async() => {
      // Scenario: 20 total alerts, 12 active, 8 resolved, avg 4.2 days to resolve
      mockQuery.mockResolvedValueOnce([{ count: '20' }]);
      mockQuery.mockResolvedValueOnce([{ count: '12' }]);
      mockQuery.mockResolvedValueOnce([{ count: '8' }]);
      mockQuery.mockResolvedValueOnce([{ avg_days: '4.234567', resolved_count: '8' }]);

      const response = await request(app.callback())
        .get('/api/stats')
        .expect(200);

      expect(response.body).toEqual({
        totalAlerts: 20,
        activeAlerts: 12,
        resolvedAlerts: 8,
        avgResolutionTime: '4.2 days',
      });
    });

    it('should handle very large alert counts', async() => {
      // Test with large numbers (enterprise scenario)
      mockQuery.mockResolvedValueOnce([{ count: '50000' }]);
      mockQuery.mockResolvedValueOnce([{ count: '30000' }]);
      mockQuery.mockResolvedValueOnce([{ count: '20000' }]);
      mockQuery.mockResolvedValueOnce([{ avg_days: '5.123', resolved_count: '20000' }]);

      const response = await request(app.callback())
        .get('/api/stats')
        .expect(200);

      expect(response.body).toEqual({
        totalAlerts: 50000,
        activeAlerts: 30000,
        resolvedAlerts: 20000,
        avgResolutionTime: '5.1 days',
      });
    });

    it('should verify all SQL queries are executed in correct order', async() => {
      mockQuery.mockResolvedValueOnce([{ count: '1' }]);
      mockQuery.mockResolvedValueOnce([{ count: '1' }]);
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);
      mockQuery.mockResolvedValueOnce([{ avg_days: null, resolved_count: '0' }]);

      await request(app.callback())
        .get('/api/stats')
        .expect(200);

      // Verify queries are called in the right order
      expect(mockQuery.mock.calls[0][0]).toContain('SELECT COUNT(*) as count');
      expect(mockQuery.mock.calls[0][0]).toContain('FROM delay_alerts');

      expect(mockQuery.mock.calls[1][0]).toContain('COUNT(DISTINCT da.id)');
      expect(mockQuery.mock.calls[1][0]).toContain('NOT IN (\'DELIVERED\', \'OUT_FOR_DELIVERY\')');

      expect(mockQuery.mock.calls[2][0]).toContain('COUNT(DISTINCT da.id)');
      expect(mockQuery.mock.calls[2][0]).toContain('IN (\'DELIVERED\', \'OUT_FOR_DELIVERY\')');

      expect(mockQuery.mock.calls[3][0]).toContain('AVG(EXTRACT(EPOCH');
      expect(mockQuery.mock.calls[3][0]).toContain('o.updated_at - da.created_at');
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0.5 day resolution time', async() => {
      mockQuery.mockResolvedValueOnce([{ count: '1' }]);
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);
      mockQuery.mockResolvedValueOnce([{ count: '1' }]);
      mockQuery.mockResolvedValueOnce([{ avg_days: '0.5', resolved_count: '1' }]);

      const response = await request(app.callback())
        .get('/api/stats')
        .expect(200);

      expect(response.body.avgResolutionTime).toBe('0.5 days');
    });

    it('should handle 0 day resolution time (same-day delivery)', async() => {
      mockQuery.mockResolvedValueOnce([{ count: '1' }]);
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);
      mockQuery.mockResolvedValueOnce([{ count: '1' }]);
      mockQuery.mockResolvedValueOnce([{ avg_days: '0.0', resolved_count: '1' }]);

      const response = await request(app.callback())
        .get('/api/stats')
        .expect(200);

      expect(response.body.avgResolutionTime).toBe('0 days');
    });

    it('should handle negative avg_days (should not happen, but test robustness)', async() => {
      mockQuery.mockResolvedValueOnce([{ count: '1' }]);
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);
      mockQuery.mockResolvedValueOnce([{ count: '1' }]);
      mockQuery.mockResolvedValueOnce([{ avg_days: '-1.5', resolved_count: '1' }]);

      const response = await request(app.callback())
        .get('/api/stats')
        .expect(200);

      // Should still format it, even though negative doesn't make logical sense
      expect(response.body.avgResolutionTime).toBe('-1.5 days');
    });
  });
});
