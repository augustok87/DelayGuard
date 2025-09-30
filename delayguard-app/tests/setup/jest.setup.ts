// Jest setup file for DelayGuard testing
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/delayguard_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.SHOPIFY_API_KEY = 'test_api_key';
process.env.SHOPIFY_API_SECRET = 'test_api_secret';
process.env.SHIPENGINE_API_KEY = 'test_shipengine_key';
process.env.SENDGRID_API_KEY = 'test_sendgrid_key';
process.env.TWILIO_ACCOUNT_SID = 'test_twilio_sid';
process.env.TWILIO_AUTH_TOKEN = 'test_twilio_token';
process.env.TWILIO_PHONE_NUMBER = '+1234567890';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock window.matchMedia for Polaris
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as any;

// Mock window.prompt for delay detection tests
Object.defineProperty(window, 'prompt', {
  writable: true,
  value: jest.fn(),
});

// Mock window.alert for delay detection tests
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn(),
});

// Mock external API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    status: 200,
    headers: new Headers(),
    redirected: false,
    statusText: 'OK',
    type: 'basic',
    url: '',
    clone: () => ({} as Response),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  } as Response)
) as jest.MockedFunction<typeof fetch>;

// Test utilities
export const mockApiResponse = (data: any, status = 200) => {
  (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    status,
    headers: new Headers(),
    redirected: false,
    statusText: 'OK',
    type: 'basic',
    url: '',
    clone: () => ({} as Response),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  } as Response);
};

export const mockApiError = (message: string, status = 500) => {
  (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
    ok: false,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(JSON.stringify({ error: message })),
    status,
    headers: new Headers(),
    redirected: false,
    statusText: 'Internal Server Error',
    type: 'basic',
    url: '',
    clone: () => ({} as Response),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  } as Response);
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test timeout
jest.setTimeout(10000);