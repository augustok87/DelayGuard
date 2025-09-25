// Core domain types
export interface OrderInfo {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shopDomain: string;
  createdAt: Date;
}

export interface TrackingInfo {
  trackingNumber: string;
  carrierCode: string;
  status: string;
  estimatedDeliveryDate?: string;
  originalEstimatedDeliveryDate?: string;
  events: TrackingEvent[];
  trackingUrl?: string;
}

export interface TrackingEvent {
  timestamp: string;
  status: string;
  location?: string;
  description: string;
}

export interface DelayDetectionResult {
  isDelayed: boolean;
  delayDays?: number;
  delayReason?: 'DELAYED_STATUS' | 'EXCEPTION_STATUS' | 'DATE_DELAY' | 'ETA_EXCEEDED' | 'EVENT_DELAY';
  estimatedDelivery?: string;
  originalDelivery?: string;
  error?: string;
}

export interface DelayDetails {
  estimatedDelivery: string;
  trackingNumber: string;
  trackingUrl: string;
  delayDays: number;
  delayReason: string;
}

// Service interfaces
export interface DelayDetectionService {
  checkForDelays(trackingInfo: TrackingInfo): Promise<DelayDetectionResult>;
  setDelayThreshold(threshold: number): void;
  getDelayThreshold(): number;
}

export interface EmailService {
  sendDelayEmail(email: string, orderInfo: OrderInfo, delayDetails: DelayDetails): Promise<void>;
}

export interface SMSService {
  sendDelaySMS(phone: string, orderInfo: OrderInfo, delayDetails: DelayDetails): Promise<void>;
}

export interface CarrierService {
  getTrackingInfo(trackingNumber: string, carrierCode: string): Promise<TrackingInfo>;
  validateTrackingNumber(trackingNumber: string, carrierCode: string): Promise<boolean>;
  getCarrierList(): Promise<Array<{ code: string; name: string }>>;
}

// Configuration types
export interface AppConfig {
  shopify: {
    apiKey: string;
    apiSecret: string;
    scopes: string[];
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  shipengine: {
    apiKey: string;
  };
  sendgrid: {
    apiKey: string;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
}

// Error types
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
  field?: string;
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`External service error (${service}): ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
  service: string;
}

// Webhook types
export interface ShopifyWebhook {
  id: string;
  topic: string;
  data: any;
  shop_domain: string;
  created_at: string;
}

export interface OrderUpdateWebhook extends ShopifyWebhook {
  topic: 'orders/updated';
  data: {
    id: string;
    name: string;
    email: string;
    fulfillments: Array<{
      id: string;
      tracking_info: {
        number: string;
        company: string;
        url?: string;
      };
    }>;
  };
}
