import { CarrierService } from '@/services/carrier-service';

// Mock axios
jest.mock('axios');
const mockedAxios = require('axios');

describe('CarrierService', () => {
  let carrierService: CarrierService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    carrierService = new CarrierService('test-api-key');
    jest.clearAllMocks();
  });

  describe('getTrackingInfo', () => {
    it('should fetch tracking information successfully', async() => {
      const mockResponse = {
        data: {
          tracking_number: '1Z999AA1234567890',
          carrier_code: 'ups',
          status_code: 'IT',
          estimated_delivery_date: '2024-02-15',
          original_estimated_delivery_date: '2024-02-10',
          events: [
            {
              occurred_at: '2024-02-01T10:00:00Z',
              status_code: 'AC',
              city_locality: 'Atlanta',
              state_province: 'GA',
              description: 'Package accepted',
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await carrierService.getTrackingInfo('1Z999AA1234567890', 'ups');

      expect(result.trackingNumber).toBe('1Z999AA1234567890');
      expect(result.carrierCode).toBe('ups');
      expect(result.status).toBe('IN_TRANSIT');
      expect(result.estimatedDeliveryDate).toBe('2024-02-15');
      expect(result.events).toHaveLength(1);
    });

    it('should handle API errors gracefully', async() => {
      const axiosError = new Error('Tracking number not found');
      (axiosError as any).response = { status: 404 };
      (axiosError as any).isAxiosError = true;
      
      mockAxiosInstance.get.mockRejectedValue(axiosError);

      await expect(
        carrierService.getTrackingInfo('invalid', 'ups'),
      ).rejects.toThrow('External service error (ShipEngine): Tracking number not found');
    });

    it('should handle rate limit errors', async() => {
      const axiosError = new Error('Rate limit exceeded');
      (axiosError as any).response = { status: 429 };
      (axiosError as any).isAxiosError = true;
      
      mockAxiosInstance.get.mockRejectedValue(axiosError);

      await expect(
        carrierService.getTrackingInfo('1Z999AA1234567890', 'ups'),
      ).rejects.toThrow('External service error (ShipEngine): Rate limit exceeded');
    });
  });

  describe('validateTrackingNumber', () => {
    it('should return true for valid tracking number', async() => {
      const mockResponse = {
        data: {
          tracking_number: '1Z999AA1234567890',
          carrier_code: 'ups',
          status_code: 'IT',
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await carrierService.validateTrackingNumber('1Z999AA1234567890', 'ups');
      expect(result).toBe(true);
    });

    it('should return false for invalid tracking number', async() => {
      mockAxiosInstance.get.mockRejectedValue({
        response: { status: 404 },
      });

      const result = await carrierService.validateTrackingNumber('invalid', 'ups');
      expect(result).toBe(false);
    });
  });

  describe('getCarrierList', () => {
    it('should fetch carrier list successfully', async() => {
      const mockResponse = {
        data: {
          carriers: [
            { carrier_code: 'ups', friendly_name: 'UPS' },
            { carrier_code: 'fedex', friendly_name: 'FedEx' },
            { carrier_code: 'usps', friendly_name: 'USPS' },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await carrierService.getCarrierList();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ code: 'ups', name: 'UPS' });
    });
  });

  describe('ping', () => {
    it('returns status="healthy" with latencyMs on upstream 200', async() => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200, data: { carriers: [] } });

      const result = await carrierService.ping();

      expect(result.status).toBe('healthy');
      expect(typeof result.latencyMs).toBe('number');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      // Regression guard: ping must use the lightest probe endpoint, not /v1/tracking
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/carriers', expect.any(Object));
    });

    it('passes a 5000ms timeout to axios (regression guard against silent disable)', async() => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200, data: { carriers: [] } });

      await carrierService.ping();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/carriers', expect.objectContaining({ timeout: 5000 }));
    });

    it('returns status="degraded" with HTTP status in error on upstream non-2xx', async() => {
      const mockedAxiosLib = require('axios');
      mockedAxiosLib.isAxiosError = jest.fn().mockReturnValue(true);
      const axiosError = new Error('Request failed with status code 500');
      (axiosError as any).response = { status: 500, statusText: 'Internal Server Error' };
      (axiosError as any).isAxiosError = true;
      mockAxiosInstance.get.mockRejectedValue(axiosError);

      const result = await carrierService.ping();

      expect(result.status).toBe('degraded');
      if (result.status === 'degraded') {
        expect(result.error).toMatch(/HTTP 500/);
        expect(typeof result.latencyMs).toBe('number');
      }
    });

    it('returns status="unhealthy" with /timeout/i error when axios aborts after 5s', async() => {
      const mockedAxiosLib = require('axios');
      mockedAxiosLib.isAxiosError = jest.fn().mockReturnValue(true);
      const timeoutError = new Error('timeout of 5000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      (timeoutError as any).isAxiosError = true;
      mockAxiosInstance.get.mockRejectedValue(timeoutError);

      const result = await carrierService.ping();

      expect(result.status).toBe('unhealthy');
      if (result.status === 'unhealthy') {
        expect(result.error).toMatch(/timeout/i);
      }
    });

    it('returns status="unhealthy" on network failure (no response)', async() => {
      const mockedAxiosLib = require('axios');
      mockedAxiosLib.isAxiosError = jest.fn().mockReturnValue(true);
      const networkError = new Error('connect ECONNREFUSED');
      (networkError as any).code = 'ECONNREFUSED';
      (networkError as any).isAxiosError = true;
      mockAxiosInstance.get.mockRejectedValue(networkError);

      const result = await carrierService.ping();

      expect(result.status).toBe('unhealthy');
      if (result.status === 'unhealthy') {
        expect(result.error).toMatch(/ECONNREFUSED/);
      }
    });

    it('never throws — always resolves to a PingResult across every failure path', async() => {
      const mockedAxiosLib = require('axios');
      mockedAxiosLib.isAxiosError = jest.fn().mockReturnValue(false);
      // Non-axios, non-Error rejection — the nastiest shape ping() must still tolerate
      mockAxiosInstance.get.mockRejectedValue('plain-string-rejection');

      await expect(carrierService.ping()).resolves.toBeDefined();
      const result = await carrierService.ping();
      expect(result.status).toBe('unhealthy');
    });
  });
});
