import { CarrierService } from '@/services/carrier-service';

// Mock axios
jest.mock('axios');
const mockedAxios = require('axios');

/**
 * CarrierService talks to EasyPost (R24, 2026-08-26).
 *
 * ShipEngine's /v1/tracking is gated behind a $75/mo plan that this account
 * does not hold — proven twice, on two separately-connected carriers, both
 * 401 "You must upgrade your billing plan". RULES 2 and 3 had therefore never
 * fired in production (tracking_events = 0). EasyPost is pay-per-shipment and
 * additionally exposes status_detail values ShipEngine never gave us
 * ("delayed", "weather_delay"), which is what RULE 2 is actually asking about.
 */
describe('CarrierService (EasyPost)', () => {
  let carrierService: CarrierService;
  let mockAxiosInstance: any;

  const trackerFixture = (overrides: Record<string, unknown> = {}) => ({
    id: 'trk_abc123',
    object: 'Tracker',
    mode: 'test',
    tracking_code: '1Z999AA1234567890',
    carrier: 'UPS',
    status: 'in_transit',
    status_detail: 'departed_facility',
    est_delivery_date: '2026-09-02T00:00:00Z',
    public_url: 'https://track.easypost.com/djE6dHJr',
    tracking_details: [],
    ...overrides,
  });

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    mockedAxios.isAxiosError = jest.fn().mockReturnValue(false);

    carrierService = new CarrierService('EZTK_test_key');
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('throws when no API key is available', () => {
      const saved = process.env.EASYPOST_API_KEY;
      delete process.env.EASYPOST_API_KEY;

      expect(() => new CarrierService('')).toThrow(/EasyPost API key/i);

      process.env.EASYPOST_API_KEY = saved;
    });

    it('authenticates with HTTP Basic, API key as username and empty password', () => {
      new CarrierService('EZTK_test_key');

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.easypost.com/v2',
          auth: { username: 'EZTK_test_key', password: '' },
        }),
      );
    });
  });

  describe('getTrackingInfo', () => {
    it('creates a tracker with the EasyPost carrier name, not our internal code', async() => {
      mockAxiosInstance.post.mockResolvedValue({ data: trackerFixture() });

      await carrierService.getTrackingInfo('1Z999AA1234567890', 'ups');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/trackers', {
        tracker: { tracking_code: '1Z999AA1234567890', carrier: 'UPS' },
      });
    });

    it('omits carrier entirely for an unrecognised code so EasyPost auto-detects', async() => {
      mockAxiosInstance.post.mockResolvedValue({ data: trackerFixture() });

      await carrierService.getTrackingInfo('XYZ123', 'some_regional_carrier');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/trackers', {
        tracker: { tracking_code: 'XYZ123' },
      });
    });

    it('maps the tracker onto TrackingInfo', async() => {
      mockAxiosInstance.post.mockResolvedValue({
        data: trackerFixture({
          tracking_details: [
            {
              datetime: '2026-08-28T14:02:00Z',
              status: 'in_transit',
              status_detail: 'departed_facility',
              message: 'Departed FedEx location',
              tracking_location: { city: 'Memphis', state: 'TN', country: 'US' },
            },
          ],
        }),
      });

      const result = await carrierService.getTrackingInfo('1Z999AA1234567890', 'ups');

      expect(result).toEqual({
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'ups',
        status: 'IN_TRANSIT',
        estimatedDeliveryDate: '2026-09-02T00:00:00Z',
        originalEstimatedDeliveryDate: undefined,
        trackingUrl: 'https://track.easypost.com/djE6dHJr',
        events: [
          {
            timestamp: '2026-08-28T14:02:00Z',
            status: 'IN_TRANSIT',
            location: 'Memphis, TN',
            description: 'Departed FedEx location',
          },
        ],
      });
    });

    it('tolerates a tracker with no tracking_details', async() => {
      mockAxiosInstance.post.mockResolvedValue({
        data: trackerFixture({ tracking_details: undefined }),
      });

      const result = await carrierService.getTrackingInfo('1Z999AA1234567890', 'ups');

      expect(result.events).toEqual([]);
    });

    it('omits location when the scan carries no city', async() => {
      mockAxiosInstance.post.mockResolvedValue({
        data: trackerFixture({
          tracking_details: [
            {
              datetime: '2026-08-28T14:02:00Z',
              status: 'in_transit',
              message: 'In transit',
              tracking_location: { city: null, state: null, country: 'US' },
            },
          ],
        }),
      });

      const result = await carrierService.getTrackingInfo('1Z999AA1234567890', 'ups');

      expect(result.events[0].location).toBeUndefined();
    });
  });

  /**
   * The whole point of the migration. delay-detection.ts branches on the
   * internal vocabulary "DELAYED" / "EXCEPTION"; EasyPost expresses both in
   * status_detail rather than status, so a status-only mapping would leave
   * RULE 2 exactly as dead as it was under ShipEngine.
   */
  describe('status mapping', () => {
    const mapped = async(status: string, statusDetail?: string) => {
      mockAxiosInstance.post.mockResolvedValue({
        data: trackerFixture({ status, status_detail: statusDetail }),
      });
      const result = await carrierService.getTrackingInfo('T1', 'ups');
      return result.status;
    };

    it.each([
      ['delayed'],
      ['weather_delay'],
    ])('maps status_detail "%s" to DELAYED', async(detail) => {
      expect(await mapped('in_transit', detail)).toBe('DELAYED');
    });

    it.each([
      ['delivery_exception'],
      ['transit_exception'],
      ['damaged'],
      ['lost'],
      ['missorted'],
      ['refused'],
      ['address_correction'],
    ])('maps status_detail "%s" to EXCEPTION', async(detail) => {
      expect(await mapped('in_transit', detail)).toBe('EXCEPTION');
    });

    it.each([
      ['delivered', 'DELIVERED'],
      ['out_for_delivery', 'OUT_FOR_DELIVERY'],
      ['in_transit', 'IN_TRANSIT'],
      ['pre_transit', 'ACCEPTED'],
      ['available_for_pickup', 'OUT_FOR_DELIVERY'],
      ['failure', 'EXCEPTION'],
      ['error', 'EXCEPTION'],
      ['cancelled', 'EXCEPTION'],
      ['return_to_sender', 'EXCEPTION'],
      ['unknown', 'UNKNOWN'],
    ])('maps status "%s" to %s', async(status, expected) => {
      expect(await mapped(status, undefined)).toBe(expected);
    });

    // Precedence: a parcel that hit an exception mid-route but ARRIVED is not
    // a delay. Without this, every recovered exception re-alerts on delivery.
    it('lets a terminal delivered status win over a stale exception detail', async() => {
      expect(await mapped('delivered', 'delivery_exception')).toBe('DELIVERED');
    });

    it('lets out_for_delivery win over a stale delay detail', async() => {
      expect(await mapped('out_for_delivery', 'delayed')).toBe('OUT_FOR_DELIVERY');
    });

    it('falls back to UNKNOWN for a status EasyPost adds later', async() => {
      expect(await mapped('teleported', undefined)).toBe('UNKNOWN');
    });
  });

  describe('error handling', () => {
    const rejectWith = (status: number) => {
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
      const error = new Error(`Request failed with status code ${status}`);
      (error as any).response = { status };
      (error as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(error);
    };

    it('reports an unusable API key distinctly from a missing parcel', async() => {
      rejectWith(401);
      await expect(carrierService.getTrackingInfo('T1', 'ups')).rejects.toThrow(/Invalid API key/i);
    });

    // Observed against the live API 2026-08-26: an unusable key answers 403
    // APIKEY.INACTIVE, not 401. Mapping only 401 buried the one error a
    // merchant-facing log most needs to name.
    it('treats a 403 inactive key as an API-key problem, not a generic outage', async() => {
      rejectWith(403);
      await expect(carrierService.getTrackingInfo('T1', 'ups')).rejects.toThrow(/Invalid API key/i);
    });

    it('reports an unknown tracking number', async() => {
      rejectWith(404);
      await expect(carrierService.getTrackingInfo('T1', 'ups')).rejects.toThrow(/not found/i);
    });

    it('reports rate limiting', async() => {
      rejectWith(429);
      await expect(carrierService.getTrackingInfo('T1', 'ups')).rejects.toThrow(/Rate limit/i);
    });

    it('names EasyPost — not ShipEngine — in the generic failure', async() => {
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(false);
      mockAxiosInstance.post.mockRejectedValue(new Error('socket hang up'));

      await expect(carrierService.getTrackingInfo('T1', 'ups')).rejects.toThrow(/EasyPost/);
    });
  });

  describe('validateTrackingNumber', () => {
    it('returns true when a tracker can be created', async() => {
      mockAxiosInstance.post.mockResolvedValue({ data: trackerFixture() });

      await expect(carrierService.validateTrackingNumber('T1', 'ups')).resolves.toBe(true);
    });

    it('returns false when EasyPost rejects the code', async() => {
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
      const error = new Error('not found');
      (error as any).response = { status: 404 };
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(carrierService.validateTrackingNumber('T1', 'ups')).resolves.toBe(false);
    });
  });

  describe('getCarrierList', () => {
    it('returns the account carrier accounts', async() => {
      mockAxiosInstance.get.mockResolvedValue({
        data: [
          { id: 'ca_1', type: 'UpsAccount', readable: 'UPS' },
          { id: 'ca_2', type: 'UspsAccount', readable: 'USPS' },
        ],
      });

      const result = await carrierService.getCarrierList();

      expect(result).toEqual([
        { code: 'UpsAccount', name: 'UPS' },
        { code: 'UspsAccount', name: 'USPS' },
      ]);
    });

    it('returns an empty list rather than throwing when the account has no carriers', async() => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      await expect(carrierService.getCarrierList()).resolves.toEqual([]);
    });
  });

  describe('ping', () => {
    it('returns status="healthy" with latencyMs on upstream 200', async() => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

      const result = await carrierService.ping();

      expect(result.status).toBe('healthy');
      expect(typeof result.latencyMs).toBe('number');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      // Regression guard: ping must use a free, read-only endpoint. Probing
      // /trackers would BILL us on every health check.
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/carrier_accounts', expect.any(Object));
    });

    it('never bills us — ping must not create a tracker', async() => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

      await carrierService.ping();

      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('passes a 5000ms timeout to axios (regression guard against silent disable)', async() => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

      await carrierService.ping();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/carrier_accounts', expect.objectContaining({ timeout: 5000 }));
    });

    it('returns status="degraded" with HTTP status in error on upstream non-2xx', async() => {
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
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
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
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
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
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
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(false);
      // Non-axios, non-Error rejection — the nastiest shape ping() must still tolerate
      mockAxiosInstance.get.mockRejectedValue('plain-string-rejection');

      await expect(carrierService.ping()).resolves.toBeDefined();
      const result = await carrierService.ping();
      expect(result.status).toBe('unhealthy');
    });
  });
});
