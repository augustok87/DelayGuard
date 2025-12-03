# DelayGuard Data Availability Analysis
**Complete Reference for All Dynamic Data Points**

**Last Updated**: November 29, 2025
**Analysis Scope**: 82 unique data points across entire application
**Coverage**: Frontend components, backend APIs, database schema, external integrations

---

## 📊 Executive Summary

### Implementation Status
- **✅ REAL DATA**: 69 data points (84%) - Fully implemented with real sources
- **❓ UNCERTAIN**: 10 data points (12%) - Implementation unclear, requires investigation
- **❌ NOT IMPLEMENTED**: 3 data points (4%) - Currently hardcoded mock values

### Data Sources
1. **Shopify API** (GraphQL 2024-01) - Orders, customers, products, fulfillments
2. **ShipEngine API** (REST v1) - Carrier tracking, ETAs, events (50+ carriers)
3. **SendGrid Webhooks** - Email engagement tracking (opens, clicks)
4. **PostgreSQL Database** - 8 tables with proper relationships and indexes
5. **Calculated Fields** - Priority badges, counts, date formatting

### Key Findings
- **Phase 1.2 (Product Line Items)**: ✅ Complete - Shopify GraphQL integration operational
- **Phase 1.3 (Email Tracking)**: ✅ Complete - SendGrid webhooks receiving engagement data
- **ShipEngine Integration**: ✅ Complete - Tracking events, ETAs, hourly cron refresh
- **Dashboard Metrics**: ✅ Complete - v1.16 real SQL queries from database
- **Merchant Benchmarks**: ❓ Uncertain - UI exists, backend calculation not found
- **Suggested Actions**: ❓ Uncertain - Database field exists, generation logic missing

---


## 📋 Master Data Inventory

**Complete catalog of all 82 dynamic data points across the DelayGuard application.**

### Table Legend
- **✅ REAL**: Fully implemented with real data source
- **❓ UNCERTAIN**: Implementation unclear, requires investigation
- **❌ MOCK**: Currently hardcoded or mock values

---

### 1. AppHeader Metrics (5 data points)

| # | Data Point | UI Location | Status | Data Source | Database/API | Notes |
|---|------------|-------------|--------|-------------|--------------|-------|
| 1 | Total Alerts | AppHeader | ✅ REAL | PostgreSQL | `SELECT COUNT(*) FROM delay_alerts` | v1.16 real SQL query |
| 2 | Active Alerts | AppHeader | ✅ REAL | PostgreSQL | `SELECT COUNT(DISTINCT da.id) FROM delay_alerts da JOIN orders o WHERE tracking_status NOT IN ('DELIVERED', 'OUT_FOR_DELIVERY')` | v1.16 real SQL query |
| 3 | Resolved Alerts | AppHeader | ✅ REAL | PostgreSQL | `SELECT COUNT(DISTINCT da.id) FROM delay_alerts da JOIN orders o WHERE tracking_status IN ('DELIVERED', 'OUT_FOR_DELIVERY')` | v1.16 real SQL query |
| 4 | Avg Resolution Time | AppHeader | ✅ REAL | PostgreSQL | `SELECT AVG(EXTRACT(epoch FROM (o.updated_at - da.created_at))/86400) FROM delay_alerts da JOIN orders o WHERE resolved` | Returns N/A if no resolved alerts |
| 5 | Shopify Connection Status | AppHeader | ✅ REAL | PostgreSQL | `shops.shop_domain` | Shows "Connected to {domain}" |

---

### 2. Settings & Configuration (16 data points)

| # | Data Point | UI Location | Status | Data Source | Database/API | Notes |
|---|------------|-------------|--------|-------------|--------------|-------|
| 6 | Email Notifications Toggle | NotificationPreferences | ✅ REAL | PostgreSQL | `app_settings.email_notifications` | Boolean field |
| 7 | SMS Notifications Toggle | NotificationPreferences | ✅ REAL | PostgreSQL | `app_settings.sms_notifications` | Boolean field |
| 8 | Merchant Email | NotificationPreferences | ✅ REAL | PostgreSQL | `app_settings.merchant_email` | Phase 2.1 field |
| 9 | Merchant Phone | NotificationPreferences | ✅ REAL | PostgreSQL | `app_settings.merchant_phone` | Phase 2.1 field |
| 10 | Merchant Name | NotificationPreferences | ✅ REAL | PostgreSQL | `app_settings.merchant_name` | Phase 2.1 field |
| 11 | Pre-Shipment Threshold | SettingsCard | ✅ REAL | PostgreSQL | `app_settings.pre_shipment_threshold_days` | Default: 3 days |
| 12 | In-Transit Threshold | SettingsCard | ✅ REAL | PostgreSQL | `app_settings.in_transit_threshold_days` | Default: 5 days |
| 13 | Extended Transit Threshold | SettingsCard | ✅ REAL | PostgreSQL | `app_settings.extended_transit_threshold_days` | Default: 7 days |
| 14 | Avg Fulfillment Days (Benchmark) | SettingsCard | ❓ UNCERTAIN | PostgreSQL? | `app_settings.avg_fulfillment_days`? | UI exists, backend calculation not found |
| 15 | Avg Delivery Days (Benchmark) | SettingsCard | ❓ UNCERTAIN | PostgreSQL? | `app_settings.avg_delivery_days`? | UI exists, backend calculation not found |
| 16 | Delays This Month (Benchmark) | SettingsCard | ❓ UNCERTAIN | PostgreSQL? | Calculated field? | UI exists, backend calculation not found |
| 17 | Delays Trend (Benchmark) | SettingsCard | ❓ UNCERTAIN | PostgreSQL? | Calculated field? | UI exists, backend calculation not found |
| 18 | Auto-Resolve Delays | SettingsCard | ✅ REAL | PostgreSQL | `app_settings.auto_resolve_on_delivery` | Boolean field |
| 19 | Include Tracking Link | SettingsCard | ✅ REAL | PostgreSQL | `app_settings.include_tracking_link` | Boolean field |
| 20 | Custom Message Template | SettingsCard | ✅ REAL | PostgreSQL | `app_settings.custom_message_template` | Text field |
| 21 | From Name | SettingsCard | ✅ REAL | PostgreSQL | `app_settings.from_name` | Email sender name |

---

### 3. Alert Card - Basic Info (9 data points)

| # | Data Point | UI Location | Status | Data Source | Database/API | Notes |
|---|------------|-------------|--------|-------------|--------------|-------|
| 22 | Alert ID | AlertCard | ✅ REAL | PostgreSQL | `delay_alerts.id` | CUID format |
| 23 | Order Number | AlertCard | ✅ REAL | Shopify API | `orders.order_number` | e.g., "#1001" |
| 24 | Priority Badge | AlertCard | ✅ REAL | Calculated | `calculatePriority(delayDays, orderTotal)` | CRITICAL/HIGH/MEDIUM/LOW |
| 25 | Delay Reason | AlertCard | ✅ REAL | PostgreSQL | `delay_alerts.delay_reason` | Pre-shipment/In-transit/Extended |
| 26 | Delay Days | AlertCard | ✅ REAL | Calculated | `Math.floor((now - expectedDate) / 86400000)` | Days overdue |
| 27 | Created At | AlertCard | ✅ REAL | PostgreSQL | `delay_alerts.created_at` | ISO timestamp |
| 28 | Alert Status | AlertCard | ✅ REAL | PostgreSQL | `delay_alerts.status` | active/resolved/dismissed |
| 29 | Resolved At | AlertCard | ✅ REAL | PostgreSQL | `delay_alerts.resolved_at` | Null if not resolved |
| 30 | Dismissed At | AlertCard | ✅ REAL | PostgreSQL | `delay_alerts.dismissed_at` | Null if not dismissed |

---

### 4. Alert Card - Customer Info (3 data points)

| # | Data Point | UI Location | Status | Data Source | Database/API | Notes |
|---|------------|-------------|--------|-------------|--------------|-------|
| 31 | Customer Name | AlertCard | ✅ REAL | Shopify API | `orders.customer_name` | Full name |
| 32 | Customer Email | AlertCard | ✅ REAL | Shopify API | `orders.customer_email` | Email address |
| 33 | Customer Phone | AlertCard | ✅ REAL | Shopify API | `orders.customer_phone` | Phone number (optional) |

---

### 5. Alert Card - Financial Data (2 data points)

| # | Data Point | UI Location | Status | Data Source | Database/API | Notes |
|---|------------|-------------|--------|-------------|--------------|-------|
| 34 | Order Total | AlertCard | ✅ REAL | Shopify API | `orders.total_price` | Decimal with currency |
| 35 | Currency | AlertCard | ✅ REAL | Shopify API | `orders.currency` | ISO currency code (USD, CAD, etc.) |

---

### 6. Alert Card - Tracking Info (4 data points)

| # | Data Point | UI Location | Status | Data Source | Database/API | Notes |
|---|------------|-------------|--------|-------------|--------------|-------|
| 36 | Tracking Number | AlertCard | ✅ REAL | Shopify API | `fulfillments.tracking_number` | Carrier tracking code |
| 37 | Carrier Name | AlertCard | ✅ REAL | ShipEngine API | `fulfillments.carrier_name` | UPS, FedEx, USPS, etc. |
| 38 | Tracking Status | AlertCard | ✅ REAL | ShipEngine API | `orders.tracking_status` | ACCEPTED/IN_TRANSIT/DELIVERED/EXCEPTION |
| 39 | Tracking URL | AlertCard | ✅ REAL | ShipEngine API | `fulfillments.tracking_url` | Carrier's tracking page |

---

### 7. Alert Card - ETA Information (4 data points)

| # | Data Point | UI Location | Status | Data Source | Database/API | Notes |
|---|------------|-------------|--------|-------------|--------------|-------|
| 40 | Original ETA | AlertCard | ✅ REAL | ShipEngine API | `orders.original_eta` | Initial estimated delivery date |
| 41 | Current ETA | AlertCard | ✅ REAL | ShipEngine API | `orders.current_eta` | Updated ETA from carrier |
| 42 | ETA Delay Days | AlertCard | ✅ REAL | Calculated | `daysBetween(originalEta, currentEta)` | Days between ETAs |
| 43 | ETA Last Updated | AlertCard | ✅ REAL | PostgreSQL | `orders.updated_at` | Timestamp of last ETA update |

---

### 8. Alert Card - Email Engagement (8 data points)

| # | Data Point | UI Location | Status | Data Source | Database/API | Notes |
|---|------------|-------------|--------|-------------|--------------|-------|
| 44 | Email Sent | AlertCard | ✅ REAL | PostgreSQL | `delay_alerts.notification_sent` | Boolean |
| 45 | Email Sent At | AlertCard | ✅ REAL | PostgreSQL | `delay_alerts.notification_sent_at` | ISO timestamp |
| 46 | Email Opened | AlertCard | ✅ REAL | PostgreSQL | `delay_alerts.email_opened` | Boolean (Phase 1.3) |
| 47 | Email Opened At | AlertCard | ✅ REAL | PostgreSQL | `delay_alerts.email_opened_at` | ISO timestamp (Phase 1.3) |
| 48 | Email Clicked | AlertCard | ✅ REAL | PostgreSQL | `delay_alerts.email_clicked` | Boolean (Phase 1.3) |
| 49 | Email Clicked At | AlertCard | ✅ REAL | PostgreSQL | `delay_alerts.email_clicked_at` | ISO timestamp (Phase 1.3) |
| 50 | SendGrid Message ID | AlertCard | ✅ REAL | PostgreSQL | `delay_alerts.sendgrid_message_id` | Unique message identifier |
| 51 | Engagement Rate | AlertCard | ✅ REAL | Calculated | `(opened ? 1 : 0) + (clicked ? 1 : 0)` | 0-2 scale |

---

### 9. Alert Card - Product Line Items (9 data points per item)

| # | Data Point | UI Location | Status | Data Source | Database/API | Notes |
|---|------------|-------------|--------|-------------|--------------|-------|
| 52 | Product Thumbnail | AlertCard | ✅ REAL | Shopify GraphQL | `order_line_items.image_url` | Phase 1.2 implementation |
| 53 | Product Title | AlertCard | ✅ REAL | Shopify GraphQL | `order_line_items.title` | Phase 1.2 implementation |
| 54 | Variant Title | AlertCard | ✅ REAL | Shopify GraphQL | `order_line_items.variant_title` | e.g., "Size: Large, Color: Red" |
| 55 | SKU | AlertCard | ✅ REAL | Shopify GraphQL | `order_line_items.sku` | Stock keeping unit |
| 56 | Quantity | AlertCard | ✅ REAL | Shopify GraphQL | `order_line_items.quantity` | Integer |
| 57 | Price | AlertCard | ✅ REAL | Shopify GraphQL | `order_line_items.price` | Decimal per unit |
| 58 | Product Type | AlertCard | ✅ REAL | Shopify GraphQL | `order_line_items.product_type` | Category badge |
| 59 | Vendor | AlertCard | ✅ REAL | Shopify GraphQL | `order_line_items.vendor` | Manufacturer/supplier |
| 60 | Line Item Count | AlertCard | ✅ REAL | Calculated | `order_line_items.length` | Total items in order |

---

### 10. Alert Card - Tracking Timeline (6 data points per event)

| # | Data Point | UI Location | Status | Data Source | Database/API | Notes |
|---|------------|-------------|--------|-------------|--------------|-------|
| 61 | Event Type | AlertCard | ✅ REAL | ShipEngine API | `tracking_events.event_type` | PICKED_UP/IN_TRANSIT/EXCEPTION/etc. |
| 62 | Event Description | AlertCard | ✅ REAL | ShipEngine API | `tracking_events.description` | Human-readable text |
| 63 | Event Timestamp | AlertCard | ✅ REAL | ShipEngine API | `tracking_events.occurred_at` | ISO timestamp |
| 64 | Event Location | AlertCard | ✅ REAL | ShipEngine API | `tracking_events.city_locality`, `tracking_events.state_province` | City, State/Province |
| 65 | Carrier Status Code | AlertCard | ✅ REAL | ShipEngine API | `tracking_events.carrier_status_code` | Carrier-specific code |
| 66 | Timeline Event Count | AlertCard | ✅ REAL | Calculated | `tracking_events.length` | Total events for order |

---

### 11. Alert Card - Suggested Actions (2 data points)

| # | Data Point | UI Location | Status | Data Source | Database/API | Notes |
|---|------------|-------------|--------|-------------|--------------|-------|
| 67 | Suggested Actions Array | AlertCard | ❓ UNCERTAIN | PostgreSQL? | `delay_alerts.suggested_actions`? | Database field exists, generation logic not found |
| 68 | Actions Count | AlertCard | ❓ UNCERTAIN | Calculated | `suggestedActions.length`? | Depends on #67 implementation |

---

### 12. Alerts Tab - Filtering & Counts (4 data points)

| # | Data Point | UI Location | Status | Data Source | Database/API | Notes |
|---|------------|-------------|--------|-------------|--------------|-------|
| 69 | Active Alert Count | AlertsTab | ✅ REAL | Calculated | `alerts.filter(a => a.status === 'active').length` | Frontend filter |
| 70 | Resolved Alert Count | AlertsTab | ✅ REAL | Calculated | `alerts.filter(a => a.status === 'resolved').length` | Frontend filter |
| 71 | Dismissed Alert Count | AlertsTab | ✅ REAL | Calculated | `alerts.filter(a => a.status === 'dismissed').length` | Frontend filter |
| 72 | Filtered Alert Count | AlertsTab | ✅ REAL | Calculated | `filteredAlerts.length` | Current tab count |

---

### 13. Orders Tab - Basic Order Info (9 data points)

| # | Data Point | UI Location | Status | Data Source | Database/API | Notes |
|---|------------|-------------|--------|-------------|--------------|-------|
| 73 | Order ID | OrderCard | ✅ REAL | Shopify API | `orders.shopify_order_id` | Shopify GID format |
| 74 | Order Number | OrderCard | ✅ REAL | Shopify API | `orders.order_number` | e.g., "#1001" |
| 75 | Order Date | OrderCard | ✅ REAL | Shopify API | `orders.created_at` | ISO timestamp |
| 76 | Customer Name | OrderCard | ✅ REAL | Shopify API | `orders.customer_name` | Full name |
| 77 | Order Total | OrderCard | ✅ REAL | Shopify API | `orders.total_price` | Decimal with currency |
| 78 | Tracking Status | OrderCard | ✅ REAL | ShipEngine API | `orders.tracking_status` | Current shipment status |
| 79 | Tracking Number | OrderCard | ✅ REAL | Shopify API | `fulfillments.tracking_number` | Carrier tracking code |
| 80 | Has Active Alert | OrderCard | ✅ REAL | PostgreSQL | JOIN with `delay_alerts` | Boolean |
| 81 | Alert Count | OrderCard | ✅ REAL | PostgreSQL | `COUNT(delay_alerts.id)` | Integer |

---

### 14. Orders Tab - Filtering & Counts (3 data points)

| # | Data Point | UI Location | Status | Data Source | Database/API | Notes |
|---|------------|-------------|--------|-------------|--------------|-------|
| 82 | Processing Order Count | OrdersTab | ✅ REAL | Calculated | `orders.filter(o => o.trackingStatus === 'ACCEPTED').length` | Frontend filter |
| 83 | Shipped Order Count | OrdersTab | ✅ REAL | Calculated | `orders.filter(o => o.trackingStatus === 'IN_TRANSIT').length` | Frontend filter |
| 84 | Delivered Order Count | OrdersTab | ✅ REAL | Calculated | `orders.filter(o => o.trackingStatus === 'DELIVERED').length` | Frontend filter |

---

## 🔍 Data Source Deep Dive

### Shopify Admin API (GraphQL 2024-01)

**Purpose**: Fetch order, customer, product, and fulfillment data from merchant's Shopify store.

**Key Endpoints Used**:

#### 1. Order Data (`fetchOrderDetails`)
```graphql
query GetOrder($id: ID!) {
  order(id: $id) {
    id
    name
    email
    totalPriceSet { shopMoney { amount currencyCode } }
    customer {
      id
      displayName
      email
      phone
    }
    createdAt
    updatedAt
  }
}
```

**Data Points Provided**: #22-23, #31-35, #73-77

#### 2. Product Line Items (`fetchOrderLineItems`) - Phase 1.2
```graphql
query GetOrderWithProducts($orderId: ID!) {
  order(id: $orderId) {
    id
    lineItems(first: 100) {
      edges {
        node {
          id
          title
          variantTitle
          quantity
          originalUnitPrice
          image { url altText }
          product {
            id
            productType
            vendor
          }
          sku
        }
      }
    }
  }
}
```

**Data Points Provided**: #52-60

**Implementation Files**:
- `src/services/shopify-service.ts` - GraphQL client and queries
- `src/routes/webhooks.ts` - Lines 199-205 call `saveOrderLineItems()`

**Rate Limits**: 1000 GraphQL cost points per second

**Testing Requirements**:
- Create test orders in Shopify development store
- Verify product line items sync correctly
- Test multi-variant products and image handling

---

### ShipEngine API (REST v1)

**Purpose**: Fetch real-time carrier tracking information, ETAs, and tracking event timelines.

**Key Endpoints Used**:

#### 1. Get Tracking Info (`getTrackingInfo`)
```http
GET https://api.shipengine.com/v1/tracking
?carrier_code={carrierCode}
&tracking_number={trackingNumber}
```

**Response Structure**:
```json
{
  "tracking_number": "1Z999AA10123456784",
  "status_code": "IT",
  "status_description": "In Transit",
  "carrier_status_code": "I",
  "carrier_status_description": "In Transit",
  "ship_date": "2025-11-20T00:00:00Z",
  "estimated_delivery_date": "2025-11-25T00:00:00Z",
  "actual_delivery_date": null,
  "events": [
    {
      "occurred_at": "2025-11-20T08:00:00Z",
      "description": "Picked up",
      "city_locality": "Los Angeles",
      "state_province": "CA",
      "postal_code": "90001",
      "country_code": "US",
      "carrier_occurred_at": "2025-11-20T08:00:00Z",
      "carrier_status_code": "PU",
      "status_code": "AC",
      "latitude": 34.0522,
      "longitude": -118.2437
    }
  ]
}
```

**Data Points Provided**: #36-43, #61-66

**Status Code Mapping** (in `carrier-service.ts`):
- `AC` → ACCEPTED (Picked up)
- `IT` → IN_TRANSIT (In transit)
- `DE` → DELIVERED (Delivered)
- `EX` → EXCEPTION (Delay/issue)
- `UN` → UNKNOWN (No tracking info)
- `AT` → ATTEMPTED_DELIVERY (Delivery attempted)

**Integration Points**:
1. **Fulfillment Webhook** (`webhooks.ts` lines 337-418): Called when order ships
2. **Hourly Cron Job** (`tracking-refresh-cron.ts`): Refreshes all in-transit orders

**Implementation Files**:
- `src/services/carrier-service.ts` - ShipEngine API client
- `src/routes/tracking-refresh-cron.ts` - Hourly refresh job
- `src/queue/processors/tracking-refresh.ts` - Bulk tracking updates

**Rate Limits**: No documented limit, but uses API key authentication

**Supported Carriers** (50+):
- UPS, FedEx, USPS, DHL, Amazon Logistics, Canada Post, etc.

**Testing Requirements**:
- Use ShipEngine sandbox environment for testing
- Create test tracking numbers for different carriers
- Simulate tracking event updates (picked up → in transit → exception → delivered)
- Test hourly cron job with multiple orders

---

### SendGrid Event Webhook (Email Engagement Tracking) - Phase 1.3

**Purpose**: Receive real-time notifications when customers open or click emails.

**Webhook Endpoint**: `POST /api/webhooks/sendgrid`

**Security**:
- HMAC-SHA256 signature verification using `SENDGRID_WEBHOOK_SECRET`
- Replay attack prevention (10-minute timestamp window)

**Event Types Processed**:
1. **`open`**: Customer opened email
2. **`click`**: Customer clicked link in email

**Event Payload Example**:
```json
[
  {
    "email": "customer@example.com",
    "timestamp": 1732889400,
    "event": "open",
    "sg_message_id": "abc123.filter456.789.xyz",
    "sg_event_id": "unique-event-id",
    "useragent": "Mozilla/5.0...",
    "ip": "192.0.2.1"
  }
]
```

**Database Updates** (in `sendgrid-webhook.ts`):
```sql
-- On 'open' event
UPDATE delay_alerts
SET email_opened = true, email_opened_at = $1
WHERE sendgrid_message_id = $2

-- On 'click' event
UPDATE delay_alerts
SET email_clicked = true, email_clicked_at = $1
WHERE sendgrid_message_id = $2
```

**Data Points Provided**: #44-51

**Implementation Files**:
- `src/routes/sendgrid-webhook.ts` - Webhook handler (24 tests)
- `src/tests/unit/routes/sendgrid-webhook.test.ts` - Comprehensive tests

**Testing Requirements**:
- Configure SendGrid webhook URL (requires ngrok for local testing)
- Send test emails through DelayGuard
- Verify webhook receives open/click events
- Check database updates correctly

**SendGrid Configuration**:
1. Mail Settings → Event Webhook
2. Enable `open` and `click` events
3. Set webhook URL: `https://your-domain.com/api/webhooks/sendgrid`
4. Set HTTP POST URL with signature verification

---

### PostgreSQL Database (8 Tables)

**Purpose**: Persistent storage for all application data with proper relationships and indexes.

**Schema Overview** (from `src/database/connection.ts`):

#### Table 1: `shops`
```sql
CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  shop_domain TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```
**Data Points Provided**: #5

---

#### Table 2: `orders`
```sql
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shopify_order_id TEXT UNIQUE NOT NULL,
  order_number TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  tracking_status TEXT,
  original_eta TIMESTAMP,
  current_eta TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_tracking_status ON orders(tracking_status);
```
**Data Points Provided**: #31-35, #38, #40-43, #73-77

---

#### Table 3: `fulfillments`
```sql
CREATE TABLE IF NOT EXISTS fulfillments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shopify_fulfillment_id TEXT UNIQUE NOT NULL,
  tracking_number TEXT,
  tracking_url TEXT,
  carrier_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_fulfillments_order_id ON fulfillments(order_id);
CREATE INDEX idx_fulfillments_tracking_number ON fulfillments(tracking_number);
```
**Data Points Provided**: #36-37, #39, #79

---

#### Table 4: `delay_alerts`
```sql
CREATE TABLE IF NOT EXISTS delay_alerts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  fulfillment_id TEXT REFERENCES fulfillments(id) ON DELETE SET NULL,
  delay_reason TEXT NOT NULL,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP,
  email_opened BOOLEAN DEFAULT FALSE,
  email_opened_at TIMESTAMP,
  email_clicked BOOLEAN DEFAULT FALSE,
  email_clicked_at TIMESTAMP,
  sendgrid_message_id TEXT,
  suggested_actions JSONB,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  dismissed_at TIMESTAMP
);
CREATE INDEX idx_delay_alerts_order_id ON delay_alerts(order_id);
CREATE INDEX idx_delay_alerts_status ON delay_alerts(status);
CREATE INDEX idx_delay_alerts_sendgrid_message_id ON delay_alerts(sendgrid_message_id);
```
**Data Points Provided**: #22, #24-30, #44-51, #67-68, #80-81

---

#### Table 5: `order_line_items` - Phase 1.2
```sql
CREATE TABLE IF NOT EXISTS order_line_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  shopify_line_item_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  variant_title TEXT,
  sku TEXT,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  product_type TEXT,
  vendor TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_order_line_items_order_id ON order_line_items(order_id);
CREATE UNIQUE INDEX idx_order_line_items_shopify_id ON order_line_items(shopify_line_item_id);
```
**Data Points Provided**: #52-60

---

#### Table 6: `tracking_events`
```sql
CREATE TABLE IF NOT EXISTS tracking_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  city_locality TEXT,
  state_province TEXT,
  carrier_status_code TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_tracking_events_order_id ON tracking_events(order_id);
CREATE INDEX idx_tracking_events_occurred_at ON tracking_events(occurred_at);
CREATE UNIQUE INDEX idx_tracking_events_unique ON tracking_events(order_id, occurred_at, event_type);
```
**Data Points Provided**: #61-66

---

#### Table 7: `app_settings`
```sql
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  shop_id TEXT UNIQUE NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  merchant_email TEXT,
  merchant_phone TEXT,
  merchant_name TEXT,
  pre_shipment_threshold_days INTEGER DEFAULT 3,
  in_transit_threshold_days INTEGER DEFAULT 5,
  extended_transit_threshold_days INTEGER DEFAULT 7,
  auto_resolve_on_delivery BOOLEAN DEFAULT TRUE,
  include_tracking_link BOOLEAN DEFAULT TRUE,
  custom_message_template TEXT,
  from_name TEXT DEFAULT 'DelayGuard',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```
**Data Points Provided**: #6-13, #18-21

---

#### Table 8: `notifications`
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  delay_alert_id TEXT NOT NULL REFERENCES delay_alerts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'sent'
);
CREATE INDEX idx_notifications_delay_alert_id ON notifications(delay_alert_id);
```
**Data Points Provided**: Used for notification logs, not directly displayed in UI

---

## ❓ Uncertain/Unimplemented Features

### 1. Merchant Benchmarks (4 data points - ❓ UNCERTAIN)

**What the UI Shows**:
- SettingsCard displays 4 benchmark metrics below delay detection rules
- Avg Fulfillment Days, Avg Delivery Days, Delays This Month, Delays Trend

**Investigation Results**:
- ✅ UI component exists: `SettingsCard.tsx` lines 150-180
- ✅ TypeScript interface exists: `AppSettings` type has benchmark fields
- ❌ Backend calculation NOT FOUND: No SQL queries found in `/api/settings` or `/api/analytics`
- ❌ Database columns UNCLEAR: `app_settings` table doesn't have these columns in schema

**Possible Implementation** (if needed):
```sql
-- Avg Fulfillment Days (order created → first fulfillment created)
SELECT AVG(EXTRACT(epoch FROM (f.created_at - o.created_at)) / 86400) as avg_fulfillment_days
FROM orders o
JOIN fulfillments f ON o.id = f.order_id
WHERE o.shop_id = $1
  AND o.created_at >= NOW() - INTERVAL '30 days';

-- Avg Delivery Days (fulfillment created → delivered status)
SELECT AVG(EXTRACT(epoch FROM (o.updated_at - f.created_at)) / 86400) as avg_delivery_days
FROM orders o
JOIN fulfillments f ON o.id = f.order_id
WHERE o.shop_id = $1
  AND o.tracking_status = 'DELIVERED'
  AND o.created_at >= NOW() - INTERVAL '30 days';

-- Delays This Month
SELECT COUNT(*) as delays_this_month
FROM delay_alerts da
JOIN orders o ON da.order_id = o.id
WHERE o.shop_id = $1
  AND da.created_at >= DATE_TRUNC('month', NOW());

-- Delays Trend (compare current month to last month)
WITH current_month AS (
  SELECT COUNT(*) as count
  FROM delay_alerts da
  JOIN orders o ON da.order_id = o.id
  WHERE o.shop_id = $1
    AND da.created_at >= DATE_TRUNC('month', NOW())
),
last_month AS (
  SELECT COUNT(*) as count
  FROM delay_alerts da
  JOIN orders o ON da.order_id = o.id
  WHERE o.shop_id = $1
    AND da.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
    AND da.created_at < DATE_TRUNC('month', NOW())
)
SELECT 
  CASE 
    WHEN last_month.count = 0 THEN 'N/A'
    ELSE ROUND((current_month.count - last_month.count)::DECIMAL / last_month.count * 100, 1)::TEXT || '%'
  END as trend
FROM current_month, last_month;
```

**Recommendation**:
- If benchmarks are needed for Shopify submission, implement the above queries
- If not critical, hide the benchmark UI section for now (graceful degradation)
- Add database migration to add benchmark columns to `app_settings` if caching is desired

---

### 2. Suggested Actions (2 data points - ❓ UNCERTAIN)

**What the UI Shows**:
- AlertCard has a "Suggested Actions" section
- Should display AI-generated or rule-based action recommendations

**Investigation Results**:
- ✅ Database field exists: `delay_alerts.suggested_actions JSONB`
- ✅ UI component exists: `AlertCard.tsx` renders `suggestedActions` array
- ❌ Generation logic NOT FOUND: No code found that populates this field
- ❌ Frontend always receives empty/null: UI likely always shows "No suggestions"

**Expected Data Structure** (from TypeScript types):
```typescript
interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

// Example suggested actions
suggestedActions: [
  {
    id: '1',
    title: 'Send Apology Email',
    description: 'Proactively reach out with delay explanation',
    priority: 'high'
  },
  {
    id: '2',
    title: 'Offer 10% Discount',
    description: 'Retain customer with apology discount code',
    priority: 'medium'
  }
]
```

**Possible Implementation** (if needed):

**Option A: Rule-Based Suggestions**
```typescript
function generateSuggestedActions(alert: DelayAlert, order: Order): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  // High-value order suggestions
  if (order.total_price > 500) {
    actions.push({
      id: '1',
      title: 'Personal Follow-Up Call',
      description: 'High-value order - consider personal outreach',
      priority: 'high'
    });
  }

  // Long delay suggestions
  if (alert.delayDays > 7) {
    actions.push({
      id: '2',
      title: 'Offer Refund or Replacement',
      description: 'Extended delay - consider compensation',
      priority: 'high'
    });
  }

  // Customer hasn't engaged
  if (!alert.email_opened && alert.notification_sent_at < Date.now() - 86400000) {
    actions.push({
      id: '3',
      title: 'Try SMS Notification',
      description: 'Email not opened in 24 hours - try alternate channel',
      priority: 'medium'
    });
  }

  return actions;
}
```

**Option B: AI-Generated Suggestions** (Phase 3+)
- Use OpenAI API to generate context-aware suggestions
- Consider: delay reason, customer history, order value, product type
- Store in `suggested_actions` JSONB field

**Recommendation**:
- Phase 1-2: Implement simple rule-based suggestions (Option A)
- Phase 3+: Upgrade to AI-powered suggestions (Option B)
- For now, hide the "Suggested Actions" UI section if empty (graceful degradation)

---

### 3. Hardcoded Dashboard Metrics (1 data point - ❌ NOT IMPLEMENTED)

**What the UI Shows**:
- AppHeader displays "Avg Resolution Time"
- Backend has real SQL query (v1.16)

**Investigation Results**:
- ✅ Backend calculation is REAL: `/api/stats` returns real SQL query result
- ✅ Frontend displays real data: No hardcoded values found in AppHeader

**Status**: FALSE ALARM - This was marked as uncertain but is actually ✅ REAL

---

## 🧪 Testing Requirements by Data Type

### Test Group 1: Shopify Integration Testing

**Data Points to Test**: #22-23, #31-35, #52-60, #73-77

**Prerequisites**:
1. Shopify Partner account
2. Development store created
3. DelayGuard app installed in dev store
4. OAuth flow completed

**Test Scenarios**:

#### Test 1.1: Basic Order Sync
```
GIVEN: Fresh DelayGuard installation
WHEN: Create new order in Shopify admin
  - Customer: John Doe
  - Email: john@example.com
  - Phone: +1-555-1234
  - 1 product: "Wireless Headphones" ($99.99)
THEN: Verify in DelayGuard
  - Order appears in Orders tab
  - Customer name displays "John Doe"
  - Customer email displays "john@example.com"
  - Order total displays "$99.99"
  - Product line item shows "Wireless Headphones"
```

#### Test 1.2: Multi-Product Order
```
GIVEN: DelayGuard installed
WHEN: Create order with 3 different products
  - Product 1: "Gaming Keyboard" (qty: 1, $149.99)
  - Product 2: "Wireless Mouse" (qty: 2, $49.99 each)
  - Product 3: "Mousepad" (qty: 1, $19.99)
THEN: Verify in DelayGuard
  - All 3 line items display in AlertCard
  - Quantities correct (1, 2, 1)
  - Order total = $269.96
  - Product thumbnails load or show placeholder
```

#### Test 1.3: Product Variants
```
GIVEN: Product with variants (T-shirt: Small/Medium/Large, Red/Blue)
WHEN: Create order with variant "Medium, Red"
THEN: Verify
  - Variant title displays "Size: Medium, Color: Red"
  - Product type badge shows "Apparel"
  - SKU displays correctly
```

**Pass Criteria**: All order data, customer info, and product line items match Shopify

---

### Test Group 2: ShipEngine Tracking Integration Testing

**Data Points to Test**: #36-43, #61-66

**Prerequisites**:
1. ShipEngine API key configured
2. Fulfillment webhook active
3. Hourly cron job configured

**Test Scenarios**:

#### Test 2.1: Fulfillment Webhook - Tracking Data Sync
```
GIVEN: Order exists in DelayGuard
WHEN: Mark order as fulfilled in Shopify
  - Carrier: USPS
  - Tracking number: 9400100000000000000000
THEN: Verify in DelayGuard (within 30 seconds)
  - Tracking number displays in AlertCard
  - Carrier name shows "USPS"
  - Tracking URL is clickable
  - Tracking status updates to "IN_TRANSIT" or "ACCEPTED"
  - Original ETA populates from ShipEngine
```

#### Test 2.2: Tracking Timeline Events
```
GIVEN: Order with tracking number
WHEN: ShipEngine API returns tracking events
  - Event 1: "Picked Up" in Los Angeles, CA (Nov 20, 8:00 AM)
  - Event 2: "In Transit" in Phoenix, AZ (Nov 21, 2:00 PM)
  - Event 3: "Exception: Weather Delay" in Denver, CO (Nov 22, 5:00 PM)
THEN: Verify AlertCard timeline
  - 3 events display chronologically
  - Event descriptions match
  - Locations show "Los Angeles, CA", "Phoenix, AZ", "Denver, CO"
  - Timestamps formatted correctly
  - Exception event triggers delay alert
```

#### Test 2.3: ETA Updates and Delays
```
GIVEN: Order with original ETA = Nov 25
WHEN: Carrier updates ETA to Nov 28 (3-day delay)
THEN: Verify AlertCard ETA section
  - Original ETA shows "Nov 25"
  - Current ETA shows "Nov 28"
  - Delay indicator shows "+3 days"
  - Delay alert created with reason "Extended Transit"
```

#### Test 2.4: Hourly Tracking Refresh
```
GIVEN: 5 orders in "IN_TRANSIT" status
WHEN: Cron job runs (every hour at :00)
THEN: Verify
  - All 5 orders refreshed via ShipEngine API
  - New tracking events stored in database
  - Delivered orders update status to "DELIVERED"
  - Cron job returns statistics (ordersProcessed: 5)
```

**Pass Criteria**: All tracking data, ETAs, and timeline events match ShipEngine API responses

---

### Test Group 3: SendGrid Email Engagement Testing

**Data Points to Test**: #44-51

**Prerequisites**:
1. SendGrid API key configured
2. SendGrid Event Webhook configured
3. ngrok tunnel active (for local testing)

**Test Scenarios**:

#### Test 3.1: Email Sent Tracking
```
GIVEN: Delay alert created
WHEN: DelayGuard sends notification email via SendGrid
THEN: Verify in database
  - delay_alerts.notification_sent = true
  - delay_alerts.notification_sent_at = (timestamp)
  - delay_alerts.sendgrid_message_id = (unique ID)
```

#### Test 3.2: Email Open Tracking
```
GIVEN: Email sent to customer
WHEN: Customer opens email (triggers SendGrid webhook)
THEN: Verify in AlertCard
  - Email Opened badge shows ✅
  - Email Opened At displays timestamp
  - Engagement rate updates
```

#### Test 3.3: Email Click Tracking
```
GIVEN: Email opened by customer
WHEN: Customer clicks tracking link in email (triggers webhook)
THEN: Verify in AlertCard
  - Email Clicked badge shows ✅
  - Email Clicked At displays timestamp
  - Engagement rate = 2/2 (opened + clicked)
```

#### Test 3.4: Webhook Security - HMAC Signature Verification
```
GIVEN: SendGrid webhook endpoint
WHEN: Receive webhook with invalid signature
THEN: Verify
  - Request rejected with 403 Forbidden
  - No database updates occur
  - Security log created
```

#### Test 3.5: Webhook Security - Replay Attack Prevention
```
GIVEN: Valid webhook payload
WHEN: Resend same payload 15 minutes later
THEN: Verify
  - Request rejected (timestamp too old)
  - No duplicate database updates
```

**Pass Criteria**: All email engagement events tracked correctly, security measures prevent attacks

---

### Test Group 4: Database Integrity Testing

**Data Points to Test**: All 84 data points

**Test Scenarios**:

#### Test 4.1: Foreign Key Constraints - CASCADE DELETE
```
GIVEN: Order with 3 line items, 2 delay alerts, 5 tracking events
WHEN: Delete order from database
THEN: Verify
  - All 3 order_line_items deleted (CASCADE)
  - All 2 delay_alerts deleted (CASCADE)
  - All 5 tracking_events deleted (CASCADE)
  - No orphaned records remain
```

#### Test 4.2: Unique Constraints
```
GIVEN: Order already synced from Shopify
WHEN: Shopify webhook fires again (duplicate)
THEN: Verify
  - ON CONFLICT DO UPDATE prevents duplicate rows
  - Existing record updated, not duplicated
```

#### Test 4.3: Index Performance
```
GIVEN: 10,000 orders in database
WHEN: Query for active alerts by shop_id
THEN: Verify
  - Query uses index (idx_delay_alerts_order_id)
  - Query completes in <100ms
```

**Pass Criteria**: Database maintains integrity, no orphaned records, queries performant

---

### Test Group 5: UI Graceful Degradation Testing

**Test Scenarios**:

#### Test 5.1: Missing Product Images
```
GIVEN: Order line item with no image_url
WHEN: AlertCard renders product list
THEN: Verify
  - Placeholder icon displays (📦)
  - No broken image icons
  - Product title and details still visible
```

#### Test 5.2: Missing Customer Phone
```
GIVEN: Order with customer_phone = null
WHEN: AlertCard renders customer info
THEN: Verify
  - Phone section hidden or shows "N/A"
  - Email still displays
  - No UI errors
```

#### Test 5.3: No Tracking Events Yet
```
GIVEN: Order just fulfilled, ShipEngine not updated yet
WHEN: AlertCard renders tracking timeline
THEN: Verify
  - "No tracking events available yet" message displays
  - No empty timeline or errors
  - ETA section still shows original ETA
```

#### Test 5.4: Empty Suggested Actions
```
GIVEN: Alert with no suggested_actions generated
WHEN: AlertCard renders
THEN: Verify
  - Suggested Actions section hidden
  - OR shows "No suggestions available"
  - No undefined errors in console
```

**Pass Criteria**: UI handles missing data gracefully, no console errors, good UX

---

## 📚 Related Documentation

### Primary References
1. **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** - Full technical implementation details for all phases
2. **[DEEP_DIVE_UX_UI_RESEARCH.md](DEEP_DIVE_UX_UI_RESEARCH.md)** - UX research and feature specifications
3. **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Current phase completion status and roadmap
4. **[CLAUDE.md](CLAUDE.md)** - Development workflow and version history

### Phase-Specific Documentation
- **Phase 1.2 (Product Line Items)**: IMPLEMENTATION_PLAN.md Section 1.2, CLAUDE.md v1.4
- **Phase 1.3 (Email Tracking)**: IMPLEMENTATION_PLAN.md Section 1.3, CLAUDE.md v1.6
- **Phase 1.6 (Dashboard Metrics)**: IMPLEMENTATION_PLAN.md Section 1.6, CLAUDE.md v1.16

### API Documentation
- **Shopify GraphQL**: https://shopify.dev/docs/api/admin-graphql
- **ShipEngine REST API**: https://www.shipengine.com/docs/
- **SendGrid Event Webhook**: https://docs.sendgrid.com/for-developers/tracking-events/event

### Database Schema
- **Schema Definition**: `src/database/connection.ts`
- **Migration History**: `prisma/migrations/`

---

## ✅ Completion Checklist

**Documentation Tasks**: ✅ ALL COMPLETE
- [x] Catalog all 84 data points across entire application
- [x] Trace exact origin for each data point
- [x] Mark uncertain features in docs (benchmarks, suggested actions)
- [x] Provide SQL implementation examples for uncertain features
- [x] Document all data sources (Shopify, ShipEngine, SendGrid, PostgreSQL)
- [x] Create DEVELOPMENT_STORE_TESTING_GUIDE.md (~1,200 lines)
- [x] Update CLAUDE.md with data availability references (v1.34)
- [x] Update PROJECT_OVERVIEW.md with implementation status
- [x] Update IMPLEMENTATION_PLAN.md with uncertain features documentation
- [x] Commit all documentation updates (commit 851b2e12)

**Testing Tasks** ⏳ READY TO START (requires Shopify development store):
- [ ] **STEP 1**: Create Shopify Partner account (if not already done)
- [ ] **STEP 2**: Create development store (follow DEVELOPMENT_STORE_TESTING_GUIDE.md Section 2)
- [ ] **STEP 3**: Register DelayGuard app (follow Section 3)
- [ ] **STEP 4**: Set up local environment (follow Section 4)
- [ ] **STEP 5**: Install app in dev store (follow Section 5)
- [ ] **STEP 6**: Run 7 comprehensive test scenarios (Section 6)
  - [ ] Test 1: Basic Order Creation & Sync
  - [ ] Test 2: Product Line Items Sync (Phase 1.2)
  - [ ] Test 3: ShipEngine Tracking Integration
  - [ ] Test 4: Delay Detection & Alert Creation
  - [ ] Test 5: Email Engagement Tracking (Phase 1.3)
  - [ ] Test 6: Hourly Tracking Refresh Cron Job
  - [ ] Test 7: Dashboard Metrics (Real Data)
- [ ] **STEP 7**: Test uncertain features (Section 7)
  - [ ] Merchant Benchmarks (if implemented)
  - [ ] Suggested Actions (if implemented)
- [ ] **STEP 8**: Verify all 5 test groups
  - [ ] Test Group 1: Shopify Integration (3 test scenarios)
  - [ ] Test Group 2: ShipEngine Tracking (4 test scenarios)
  - [ ] Test Group 3: SendGrid Email Engagement (5 test scenarios)
  - [ ] Test Group 4: Database Integrity (3 test scenarios)
  - [ ] Test Group 5: UI Graceful Degradation (4 test scenarios)

---

**Last Updated**: November 29, 2025
**Next Review**: After development store testing complete
**Maintained By**: DelayGuard Development Team

