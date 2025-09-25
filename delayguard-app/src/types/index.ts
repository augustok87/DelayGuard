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
  delayReason?: 'DELAYED_STATUS' | 'EXCEPTION_STATUS' | 'DATE_DELAY' | 'ETA_EXCEEDED';
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
