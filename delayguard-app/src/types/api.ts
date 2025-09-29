// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Request Types
export interface CreateAlertRequest {
  orderId: string;
  customerName: string;
  delayDays: number;
  status: 'active' | 'resolved' | 'dismissed';
}

export interface UpdateAlertRequest {
  status?: 'active' | 'resolved' | 'dismissed';
  resolvedAt?: string;
}

export interface CreateOrderRequest {
  orderNumber: string;
  customerName: string;
  status: string;
  trackingNumber?: string;
  carrierCode?: string;
}

export interface UpdateOrderRequest {
  status?: string;
  trackingNumber?: string;
  carrierCode?: string;
}

export interface UpdateSettingsRequest {
  delayThreshold?: number;
  notificationTemplate?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
}

// API Endpoint Types
export interface ApiEndpoints {
  alerts: {
    list: string;
    create: string;
    update: (id: string) => string;
    delete: (id: string) => string;
  };
  orders: {
    list: string;
    create: string;
    update: (id: string) => string;
    delete: (id: string) => string;
  };
  settings: {
    get: string;
    update: string;
  };
  health: {
    check: string;
  };
}

// API Client Configuration
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}

// Query Parameters
export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filter?: Record<string, any>;
  search?: string;
}

// Webhook Types
export interface WebhookPayload {
  id: string;
  topic: string;
  data: any;
  shop_domain: string;
  created_at: string;
}

export interface OrderUpdateWebhook extends WebhookPayload {
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

export interface FulfillmentUpdateWebhook extends WebhookPayload {
  topic: 'fulfillments/updated';
  data: {
    id: string;
    order_id: string;
    tracking_info: {
      number: string;
      company: string;
      url?: string;
    };
  };
}
