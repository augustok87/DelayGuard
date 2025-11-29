# DelayGuard Development Store Testing Guide
**Complete Step-by-Step Walkthrough for Testing with Shopify Development Store**

**Last Updated**: November 29, 2025
**Purpose**: Verify all 84 data points work correctly with real Shopify data
**Estimated Time**: 4-6 hours for complete testing

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Creating a Shopify Development Store](#creating-a-shopify-development-store)
3. [Registering DelayGuard App](#registering-delayguard-app)
4. [Local Development Setup](#local-development-setup)
5. [Installing App in Development Store](#installing-app-in-development-store)
6. [Testing Data Flow - Complete Walkthrough](#testing-data-flow---complete-walkthrough)
7. [Testing Uncertain Features](#testing-uncertain-features)
8. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
9. [Test Data Cleanup](#test-data-cleanup)
10. [Production Deployment Checklist](#production-deployment-checklist)

---

## 1. Prerequisites

### Required Accounts

- [ ] **Shopify Partner Account** (free)
  - Sign up: https://partners.shopify.com/signup
  - Required for creating development stores and apps

- [ ] **GitHub Account** (for code repository)
  - DelayGuard codebase cloned locally

- [ ] **ShipEngine Account** (free tier available)
  - Sign up: https://www.shipengine.com/signup/
  - API key required for tracking integration

- [ ] **SendGrid Account** (free tier: 100 emails/day)
  - Sign up: https://signup.sendgrid.com/
  - API key and webhook configuration required

### Required Tools

- [ ] **Node.js** (v18+ recommended)
  ```bash
  node --version  # Should show v18.0.0 or higher
  ```

- [ ] **npm** (v9+ recommended)
  ```bash
  npm --version  # Should show v9.0.0 or higher
  ```

- [ ] **ngrok** (for local webhook testing)
  ```bash
  # Install via Homebrew (macOS)
  brew install ngrok

  # Or download from https://ngrok.com/download
  ```

- [ ] **PostgreSQL** (v14+ recommended)
  ```bash
  # Install via Homebrew (macOS)
  brew install postgresql@14
  brew services start postgresql@14
  ```

- [ ] **Shopify CLI** (optional but recommended)
  ```bash
  npm install -g @shopify/cli @shopify/app
  ```

### Environment Variables Template

Create a `.env` file in the project root:

```bash
# Shopify Configuration
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_SCOPES=read_orders,read_fulfillments,read_products,read_customers

# Database
DATABASE_URL=postgresql://localhost:5432/delayguard_dev

# ShipEngine
SHIPENGINE_API_KEY=your_shipengine_api_key_here

# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_WEBHOOK_SECRET=your_webhook_secret_here
SENDGRID_FROM_EMAIL=noreply@delayguard.app

# App Configuration
APP_URL=https://your-ngrok-url.ngrok.io
PORT=3001

# Security
SESSION_SECRET=generate_a_random_32_character_string_here
```

---

## 2. Creating a Shopify Development Store

### Step 2.1: Access Partner Dashboard

1. Log in to Shopify Partners: https://partners.shopify.com/
2. Navigate to **"Stores"** in the left sidebar
3. Click **"Add store"** button

### Step 2.2: Choose Development Store Type

1. Select **"Development store"**
2. Choose store purpose: **"Test an app or theme"**
3. Click **"Continue"**

### Step 2.3: Configure Store Settings

**Store Details**:
```
Store name: DelayGuard Test Store
Store URL: delayguard-test.myshopify.com
Store purpose: Test shipping delay notifications
```

**Store Address**:
```
Country: United States (or your country)
First name: Test
Last name: Merchant
Address: 123 Test Street
City: Los Angeles
State: California
ZIP: 90001
Phone: +1-555-1234
```

**Login Credentials**:
```
Email: your-email+teststore@gmail.com
Password: (create strong password)
```

4. Click **"Create development store"**

### Step 2.4: Wait for Store Creation

- Store creation takes 2-5 minutes
- You'll receive email confirmation when ready
- Note your store URL: `delayguard-test.myshopify.com`

### Step 2.5: Access Your Development Store

1. Click **"Log in"** next to your new store in Partner Dashboard
2. You'll be logged in as the store owner
3. Familiarize yourself with Shopify Admin interface

---

## 3. Registering DelayGuard App

### Step 3.1: Create New App in Partner Dashboard

1. In Partner Dashboard, navigate to **"Apps"**
2. Click **"Create app"**
3. Select **"Public app"** (or "Custom app" for testing only)

### Step 3.2: App Configuration

**App Information**:
```
App name: DelayGuard (Development)
App URL: https://your-ngrok-url.ngrok.io
Allowed redirection URL(s):
  https://your-ngrok-url.ngrok.io/auth/callback
  https://your-ngrok-url.ngrok.io/auth/shopify/callback
```

**API Scopes** (select these):
- [x] `read_orders` - View order details
- [x] `read_fulfillments` - View shipping information
- [x] `read_products` - View product details (Phase 1.2)
- [x] `read_customers` - View customer information (Phase 2+)

### Step 3.3: Get API Credentials

After creating the app:

1. Click on your app name to view details
2. Note your **API key** (Client ID)
3. Note your **API secret** (Client secret)
4. **IMPORTANT**: Never commit API secret to git!

### Step 3.4: Configure Webhooks

In the app settings, add webhook subscriptions:

```
orders/create → https://your-ngrok-url.ngrok.io/api/webhooks/orders/create
orders/updated → https://your-ngrok-url.ngrok.io/api/webhooks/orders/updated
fulfillments/create → https://your-ngrok-url.ngrok.io/api/webhooks/fulfillments/create
fulfillments/update → https://your-ngrok-url.ngrok.io/api/webhooks/fulfillments/update
```

**Webhook API Version**: `2024-01` (GraphQL API version)

---

## 4. Local Development Setup

### Step 4.1: Clone Repository

```bash
cd ~/Documents
git clone https://github.com/your-username/DelayGuard.git
cd DelayGuard/delayguard-app
```

### Step 4.2: Install Dependencies

```bash
npm install
```

**Expected output**:
```
added 847 packages in 45s
```

### Step 4.3: Database Setup

#### Create Database

```bash
# Create PostgreSQL database
createdb delayguard_dev

# Verify database exists
psql -l | grep delayguard_dev
```

#### Run Database Migrations

```bash
# Run connection.ts to create tables
node -e "require('./src/database/connection.ts')"

# Or use npm script if available
npm run db:migrate
```

**Expected output**:
```
✅ Database tables created successfully
✅ shops table ready
✅ orders table ready
✅ fulfillments table ready
✅ delay_alerts table ready
✅ order_line_items table ready
✅ tracking_events table ready
✅ app_settings table ready
✅ notifications table ready
```

#### Verify Tables

```bash
psql delayguard_dev -c "\dt"
```

**Expected output**:
```
              List of relations
 Schema |       Name        | Type  |  Owner
--------+-------------------+-------+---------
 public | shops             | table | your_user
 public | orders            | table | your_user
 public | fulfillments      | table | your_user
 public | delay_alerts      | table | your_user
 public | order_line_items  | table | your_user
 public | tracking_events   | table | your_user
 public | app_settings      | table | your_user
 public | notifications     | table | your_user
(8 rows)
```

### Step 4.4: Configure Environment Variables

Update `.env` file with your credentials from previous steps:

```bash
SHOPIFY_API_KEY=abc123def456  # From Step 3.3
SHOPIFY_API_SECRET=xyz789abc123def456  # From Step 3.3
DATABASE_URL=postgresql://localhost:5432/delayguard_dev
SHIPENGINE_API_KEY=your_shipengine_key  # From ShipEngine dashboard
SENDGRID_API_KEY=SG.your_sendgrid_key  # From SendGrid dashboard
SENDGRID_WEBHOOK_SECRET=random_string_here  # Generate yourself
SESSION_SECRET=$(openssl rand -hex 16)  # Generate random string
```

### Step 4.5: Start ngrok Tunnel

**Why ngrok?**
Shopify webhooks need a public HTTPS URL. ngrok creates a secure tunnel to your localhost.

```bash
# In a separate terminal window
ngrok http 3001
```

**Expected output**:
```
ngrok by @inconshreveable

Session Status                online
Account                       your-account (Plan: Free)
Version                       3.3.0
Region                        United States (us)
Forwarding                    https://abc123.ngrok.io -> http://localhost:3001

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**IMPORTANT**: Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Step 4.6: Update App Configuration with ngrok URL

1. Go back to Shopify Partner Dashboard → Apps → Your App
2. Update **App URL**: `https://abc123.ngrok.io`
3. Update **Allowed redirection URLs**: `https://abc123.ngrok.io/auth/callback`
4. Update **Webhook URLs** to use ngrok URL
5. Update `.env` file: `APP_URL=https://abc123.ngrok.io`

### Step 4.7: Start Development Server

```bash
# In the main terminal (not ngrok terminal)
npm run dev
```

**Expected output**:
```
> delayguard-app@1.0.0 dev
> node src/server-simple.ts

🚀 Server running on port 3001
📊 Database connected successfully
✅ All systems ready
🔗 App URL: https://abc123.ngrok.io
```

### Step 4.8: Verify Server is Running

```bash
# In another terminal
curl http://localhost:3001/health
```

**Expected output**:
```json
{"status":"ok","timestamp":"2025-11-29T10:00:00.000Z"}
```

---

## 5. Installing App in Development Store

### Step 5.1: Generate Installation URL

**Manual Method**:

```
https://delayguard-test.myshopify.com/admin/oauth/authorize?client_id=YOUR_API_KEY&scope=read_orders,read_fulfillments,read_products,read_customers&redirect_uri=https://abc123.ngrok.io/auth/callback
```

Replace:
- `delayguard-test.myshopify.com` with your store URL
- `YOUR_API_KEY` with your Shopify API key
- `https://abc123.ngrok.io` with your ngrok URL

**Shopify CLI Method** (easier):

```bash
shopify app dev --store delayguard-test.myshopify.com
```

### Step 5.2: Approve App Installation

1. Open installation URL in browser
2. Review permissions requested:
   - ✅ Read orders
   - ✅ Read fulfillments
   - ✅ Read products
   - ✅ Read customers
3. Click **"Install app"**

### Step 5.3: Verify OAuth Flow

**Expected behavior**:
1. Redirected to DelayGuard app
2. Database row created in `shops` table
3. Access token stored securely

**Verify in database**:
```bash
psql delayguard_dev -c "SELECT id, shop_domain, created_at FROM shops;"
```

**Expected output**:
```
          id          |         shop_domain          |       created_at
----------------------+------------------------------+------------------------
 clp1a2b3c4d5e6f7g8h9 | delayguard-test.myshopify.com | 2025-11-29 10:05:32.123
(1 row)
```

### Step 5.4: Access DelayGuard in Shopify Admin

1. In Shopify Admin, look for **"Apps"** in left sidebar
2. Click on **"DelayGuard"** (should appear in installed apps)
3. DelayGuard interface loads in embedded iframe
4. Verify you see the 3 tabs: Settings, Alerts, Orders

---

## 6. Testing Data Flow - Complete Walkthrough

### Test 1: Basic Order Creation & Sync

**Objective**: Verify Shopify order data syncs to DelayGuard
**Data Points Tested**: #22-23, #31-35, #73-77
**Estimated Time**: 10 minutes

#### Step 1.1: Create Test Order in Shopify

1. In Shopify Admin → **Orders** → **Create order**
2. **Add customer**:
   ```
   Search for existing: (none)
   Create new customer:
     First name: John
     Last name: Doe
     Email: john.doe@example.com
     Phone: +1-555-0001
   ```
3. **Add products**:
   ```
   Product: Wireless Headphones (or create new product)
   Quantity: 1
   Price: $99.99
   ```
4. **Shipping address**:
   ```
   Address: 456 Customer Lane
   City: San Francisco
   State: CA
   ZIP: 94102
   ```
5. Click **"Collect payment"** → **"Mark as paid"**
6. Click **"Create order"**

#### Step 1.2: Verify Webhook Received

Check server logs (in terminal running `npm run dev`):

```
📨 Webhook received: orders/create
📦 Order ID: gid://shopify/Order/5678901234
✅ Order synced to database
```

#### Step 1.3: Verify Database Storage

```bash
psql delayguard_dev -c "SELECT order_number, customer_name, customer_email, total_price FROM orders ORDER BY created_at DESC LIMIT 1;"
```

**Expected output**:
```
 order_number | customer_name |    customer_email     | total_price
--------------+---------------+-----------------------+-------------
 #1001        | John Doe      | john.doe@example.com  |       99.99
(1 row)
```

#### Step 1.4: Verify UI Display

1. Go to DelayGuard app in Shopify Admin
2. Click **"Orders"** tab
3. Verify order appears:
   - ✅ Order #1001 visible
   - ✅ Customer name: "John Doe"
   - ✅ Customer email: "john.doe@example.com"
   - ✅ Order total: "$99.99"
   - ✅ Status: "Processing" (ACCEPTED)

**✅ PASS CRITERIA**: All order data matches Shopify exactly

---

### Test 2: Product Line Items Sync (Phase 1.2)

**Objective**: Verify product details sync via Shopify GraphQL
**Data Points Tested**: #52-60
**Estimated Time**: 15 minutes

#### Step 2.1: Create Multi-Product Order

1. In Shopify Admin → **Orders** → **Create order**
2. **Add customer**: Use existing "John Doe" or create new
3. **Add 3 products**:
   ```
   Product 1: Gaming Keyboard
     Variant: Mechanical, RGB
     Quantity: 1
     Price: $149.99
     SKU: KB-001-RGB

   Product 2: Wireless Mouse
     Variant: Ergonomic, Black
     Quantity: 2
     Price: $49.99 each
     SKU: MS-002-BLK

   Product 3: Mousepad
     Variant: XL, Black
     Quantity: 1
     Price: $19.99
     SKU: MP-003-XL
   ```
4. Total should be: $269.96
5. Click **"Mark as paid"** → **"Create order"**

#### Step 2.2: Verify GraphQL Query Execution

Check server logs:

```
📨 Webhook received: orders/updated
🔍 Fetching line items via GraphQL for order: gid://shopify/Order/5678901235
✅ Retrieved 3 line items from Shopify
💾 Stored 3 line items in database
```

#### Step 2.3: Verify Database Storage

```bash
psql delayguard_dev -c "
  SELECT oli.title, oli.variant_title, oli.sku, oli.quantity, oli.price
  FROM order_line_items oli
  JOIN orders o ON oli.order_id = o.id
  WHERE o.order_number = '#1002'
  ORDER BY oli.created_at;
"
```

**Expected output**:
```
      title       |   variant_title    |    sku     | quantity | price
------------------+--------------------+------------+----------+--------
 Gaming Keyboard  | Mechanical, RGB    | KB-001-RGB |        1 | 149.99
 Wireless Mouse   | Ergonomic, Black   | MS-002-BLK |        2 |  49.99
 Mousepad         | XL, Black          | MP-003-XL  |        1 |  19.99
(3 rows)
```

#### Step 2.4: Verify UI Display

1. Go to DelayGuard → **Orders** tab
2. Find order #1002
3. Click to expand details (or view in alert if delayed)
4. Verify product line items:
   - ✅ All 3 products display
   - ✅ Product thumbnails load (or show 📦 placeholder)
   - ✅ Quantities correct: 1, 2, 1
   - ✅ Prices match: $149.99, $49.99, $19.99
   - ✅ Variant titles display correctly
   - ✅ SKUs visible
   - ✅ Order total = $269.96

**✅ PASS CRITERIA**: All 3 line items display with correct details

---

### Test 3: ShipEngine Tracking Integration

**Objective**: Verify carrier tracking data syncs from ShipEngine
**Data Points Tested**: #36-43, #61-66
**Estimated Time**: 20 minutes

#### Step 3.1: Create Fulfillment in Shopify

1. Go to existing order #1001 (from Test 1)
2. Click **"Fulfill items"**
3. **Tracking information**:
   ```
   Carrier: USPS
   Tracking number: 9400100000000000000001
   ```

   **Note**: For real tracking data, use ShipEngine sandbox tracking numbers:
   - USPS: `9400100000000000000000` (test number with events)
   - UPS: `1Z999AA10123456784` (test number with events)
   - FedEx: `123456789012` (test number with events)

4. Click **"Fulfill items"**

#### Step 3.2: Verify Webhook Fires

Check server logs:

```
📨 Webhook received: fulfillments/create
📦 Fulfillment ID: gid://shopify/Fulfillment/3456789012
🚚 Tracking number: 9400100000000000000001
🔍 Calling ShipEngine API...
✅ ShipEngine response received
📍 Retrieved 5 tracking events
💾 Stored tracking events in database
⏰ Original ETA: 2025-12-05
⏰ Current ETA: 2025-12-05
```

#### Step 3.3: Verify Database Storage

**Check fulfillment data**:
```bash
psql delayguard_dev -c "
  SELECT f.tracking_number, f.carrier_name, o.tracking_status, o.original_eta
  FROM fulfillments f
  JOIN orders o ON f.order_id = o.id
  WHERE o.order_number = '#1001';
"
```

**Expected output**:
```
    tracking_number     | carrier_name | tracking_status |     original_eta
------------------------+--------------+-----------------+---------------------
 9400100000000000000001 | USPS         | IN_TRANSIT      | 2025-12-05 00:00:00
(1 row)
```

**Check tracking events**:
```bash
psql delayguard_dev -c "
  SELECT te.event_type, te.description, te.city_locality, te.state_province, te.occurred_at
  FROM tracking_events te
  JOIN orders o ON te.order_id = o.id
  WHERE o.order_number = '#1001'
  ORDER BY te.occurred_at;
"
```

**Expected output**:
```
 event_type |      description       | city_locality | state_province |      occurred_at
------------+------------------------+---------------+----------------+---------------------
 PICKED_UP  | Picked up by USPS      | Los Angeles   | CA             | 2025-11-25 08:00:00
 IN_TRANSIT | In transit to facility | Phoenix       | AZ             | 2025-11-26 14:30:00
 IN_TRANSIT | Departed facility      | Las Vegas     | NV             | 2025-11-27 10:15:00
 IN_TRANSIT | Arrived at facility    | Sacramento    | CA             | 2025-11-28 16:45:00
 IN_TRANSIT | Out for delivery       | San Francisco | CA             | 2025-11-29 06:00:00
(5 rows)
```

#### Step 3.4: Verify UI Display - Tracking Timeline

1. Go to DelayGuard → **Alerts** tab (if delay) or **Orders** tab
2. Find order #1001
3. View tracking timeline section
4. Verify:
   - ✅ 5 events display chronologically
   - ✅ Event descriptions match database
   - ✅ Locations show "Los Angeles, CA", "Phoenix, AZ", etc.
   - ✅ Timestamps formatted correctly
   - ✅ Event icons display (if implemented)

#### Step 3.5: Verify UI Display - ETA Information

In the same order view:

1. Verify ETA section shows:
   - ✅ Original ETA: "Dec 5, 2025"
   - ✅ Current ETA: "Dec 5, 2025"
   - ✅ No delay indicator (ETAs match)

**✅ PASS CRITERIA**: All tracking events and ETAs match ShipEngine API response

---

### Test 4: Delay Detection & Alert Creation

**Objective**: Verify delays are detected and alerts created
**Data Points Tested**: #22-30, #24-26
**Estimated Time**: 25 minutes

#### Step 4.1: Create Order with Potential Delay

**Scenario A: Pre-Shipment Delay** (easiest to test)

1. Create new order #1003 (following Test 1 steps)
2. **Do NOT fulfill the order**
3. Wait 3 days OR manually update database to simulate delay:

```bash
# Manually simulate 4-day-old order (exceeds 3-day threshold)
psql delayguard_dev -c "
  UPDATE orders
  SET created_at = NOW() - INTERVAL '4 days'
  WHERE order_number = '#1003';
"
```

4. **Trigger delay detection check** (normally runs hourly via cron):

```bash
# Run delay detection manually
npm run check-delays
# OR
curl http://localhost:3001/api/cron/check-delays
```

#### Step 4.2: Verify Alert Creation

Check server logs:

```
🔍 Running delay detection check...
📦 Checking 1 unfulfilled order(s)
⚠️  Delay detected: Order #1003 (4 days since creation)
🚨 Creating delay alert with reason: Pre-Shipment Delay
✅ Alert created: ID clp2b3c4d5e6f7g8h9i0
📧 Sending notification email...
✅ Email sent via SendGrid
```

**Verify database**:
```bash
psql delayguard_dev -c "
  SELECT da.id, o.order_number, da.delay_reason, da.status, da.notification_sent
  FROM delay_alerts da
  JOIN orders o ON da.order_id = o.id
  WHERE o.order_number = '#1003';
"
```

**Expected output**:
```
          id          | order_number |   delay_reason    | status | notification_sent
----------------------+--------------+-------------------+--------+-------------------
 clp2b3c4d5e6f7g8h9i0 | #1003        | Pre-Shipment Delay| active | t
(1 row)
```

#### Step 4.3: Verify Priority Badge Calculation

DelayGuard calculates priority based on delay days + order value:

**Priority Algorithm**:
```
CRITICAL: delayDays >= 7 OR orderTotal >= $500
HIGH: delayDays >= 5 OR orderTotal >= $200
MEDIUM: delayDays >= 3 OR orderTotal >= $100
LOW: Everything else
```

**Test with different scenarios**:

| Order Total | Delay Days | Expected Priority |
|-------------|------------|-------------------|
| $99.99      | 4 days     | MEDIUM            |
| $249.99     | 4 days     | HIGH              |
| $599.99     | 4 days     | CRITICAL          |
| $99.99      | 7 days     | CRITICAL          |

#### Step 4.4: Verify UI Display - Alerts Tab

1. Go to DelayGuard → **Alerts** tab
2. Verify alert appears:
   - ✅ Order #1003 visible in "Active" tab
   - ✅ Priority badge shows correct color and label
   - ✅ Delay reason: "Pre-Shipment Delay" (or user-friendly "Warehouse Delays")
   - ✅ Delay days: "4 days overdue"
   - ✅ Customer info displays
   - ✅ Order total displays

**✅ PASS CRITERIA**: Alert appears in UI with correct priority and details

---

### Test 5: Email Engagement Tracking (Phase 1.3)

**Objective**: Verify SendGrid webhook tracks email opens/clicks
**Data Points Tested**: #44-51
**Estimated Time**: 30 minutes

#### Step 5.1: Configure SendGrid Webhook

1. Log in to SendGrid dashboard: https://app.sendgrid.com/
2. Navigate to **Settings** → **Mail Settings** → **Event Webhook**
3. Enable **Event Notification**
4. Configure webhook:
   ```
   HTTP Post URL: https://your-ngrok-url.ngrok.io/api/webhooks/sendgrid

   Events to POST:
   ✅ Opened
   ✅ Clicked

   Signature Verification: Enabled
   Verification Key: (copy this to .env as SENDGRID_WEBHOOK_SECRET)
   ```
5. Click **"Test Your Integration"**

#### Step 5.2: Verify Webhook Security

**Test 1: Valid Signature**

Send test webhook from SendGrid dashboard.

**Expected server logs**:
```
📨 SendGrid webhook received
🔐 Verifying HMAC signature...
✅ Signature valid
📧 Processing 1 event(s)
```

**Test 2: Invalid Signature**

```bash
# Send webhook with invalid signature
curl -X POST http://localhost:3001/api/webhooks/sendgrid \
  -H "Content-Type: application/json" \
  -H "X-Twilio-Email-Event-Webhook-Signature: invalid_signature" \
  -H "X-Twilio-Email-Event-Webhook-Timestamp: $(date +%s)" \
  -d '[{"event":"open","email":"test@example.com"}]'
```

**Expected response**: `403 Forbidden - Invalid signature`

#### Step 5.3: Create Alert and Send Email

From Test 4, alert #clp2b3c4d5e6f7g8h9i0 should have sent email.

**Verify email was sent**:
```bash
psql delayguard_dev -c "
  SELECT notification_sent, notification_sent_at, sendgrid_message_id
  FROM delay_alerts
  WHERE id = 'clp2b3c4d5e6f7g8h9i0';
"
```

**Expected output**:
```
 notification_sent |  notification_sent_at  |         sendgrid_message_id
-------------------+------------------------+---------------------------------------
 t                 | 2025-11-29 10:30:15.123| abc123.filter456.789.xyz
(1 row)
```

#### Step 5.4: Simulate Email Open Event

**Option A: Use SendGrid Event Webhook Testing Tool**

1. In SendGrid dashboard → Settings → Event Webhook
2. Click **"Test Your Integration"**
3. Select **"Opened"** event
4. Use the `sendgrid_message_id` from database: `abc123.filter456.789.xyz`

**Option B: Manually Send Webhook (for testing)**

```bash
# Generate HMAC signature (use your SENDGRID_WEBHOOK_SECRET)
TIMESTAMP=$(date +%s)
PAYLOAD='[{"email":"john.doe@example.com","timestamp":'$TIMESTAMP',"event":"open","sg_message_id":"abc123.filter456.789.xyz"}]'
SECRET="your_webhook_secret_here"

# Calculate HMAC-SHA256 signature
SIGNATURE=$(echo -n "$TIMESTAMP$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

# Send webhook
curl -X POST http://localhost:3001/api/webhooks/sendgrid \
  -H "Content-Type: application/json" \
  -H "X-Twilio-Email-Event-Webhook-Signature: $SIGNATURE" \
  -H "X-Twilio-Email-Event-Webhook-Timestamp: $TIMESTAMP" \
  -d "$PAYLOAD"
```

#### Step 5.5: Verify Database Update

```bash
psql delayguard_dev -c "
  SELECT email_opened, email_opened_at
  FROM delay_alerts
  WHERE sendgrid_message_id = 'abc123.filter456.789.xyz';
"
```

**Expected output**:
```
 email_opened |     email_opened_at
--------------+------------------------
 t            | 2025-11-29 10:35:22.456
(1 row)
```

#### Step 5.6: Simulate Email Click Event

Repeat Step 5.4 but change event type to `"click"`:

```bash
PAYLOAD='[{"email":"john.doe@example.com","timestamp":'$TIMESTAMP',"event":"click","sg_message_id":"abc123.filter456.789.xyz","url":"https://tracking.usps.com/..."}]'
```

**Verify database**:
```bash
psql delayguard_dev -c "
  SELECT email_clicked, email_clicked_at
  FROM delay_alerts
  WHERE sendgrid_message_id = 'abc123.filter456.789.xyz';
"
```

**Expected output**:
```
 email_clicked |     email_clicked_at
---------------+------------------------
 t             | 2025-11-29 10:40:18.789
(1 row)
```

#### Step 5.7: Verify UI Display - Email Engagement

1. Go to DelayGuard → **Alerts** tab
2. Find alert for order #1003
3. Verify email engagement section:
   - ✅ "Email Sent" badge shows ✅
   - ✅ "Sent at" timestamp displays
   - ✅ "Email Opened" badge shows ✅
   - ✅ "Opened at" timestamp displays
   - ✅ "Email Clicked" badge shows ✅
   - ✅ "Clicked at" timestamp displays
   - ✅ Engagement rate shows "100%" or "2/2"

**✅ PASS CRITERIA**: All email engagement events tracked and displayed correctly

---

### Test 6: Hourly Tracking Refresh Cron Job

**Objective**: Verify cron job updates tracking data for in-transit orders
**Data Points Tested**: #38, #40-43, #61-66
**Estimated Time**: 15 minutes (includes waiting)

#### Step 6.1: Verify Cron Configuration

Check `vercel.json` or cron config:

```json
{
  "crons": [
    {
      "path": "/api/cron/tracking-refresh",
      "schedule": "0 * * * *"
    }
  ]
}
```

#### Step 6.2: Manually Trigger Cron Job

```bash
# Call cron endpoint with Bearer token authentication
curl -X POST http://localhost:3001/api/cron/tracking-refresh \
  -H "Authorization: Bearer your_cron_secret_token_here"
```

**Expected response**:
```json
{
  "success": true,
  "ordersProcessed": 3,
  "eventsStored": 12,
  "errors": 0,
  "timestamp": "2025-11-29T11:00:00.000Z"
}
```

#### Step 6.3: Verify Server Logs

```
🔄 Tracking refresh cron job started
📦 Found 3 orders with status IN_TRANSIT
🔍 Refreshing tracking for order #1001 (USPS 9400100000000000000001)
✅ Retrieved 6 tracking events (1 new)
💾 Stored 1 new event
🔍 Refreshing tracking for order #1004 (UPS 1Z999AA10123456784)
✅ Retrieved 4 tracking events (2 new)
💾 Stored 2 new events
🔍 Refreshing tracking for order #1005 (FedEx 123456789012)
✅ Retrieved 3 tracking events (0 new, already in DB)
📊 Cron job complete: 3 orders processed, 3 new events stored
```

#### Step 6.4: Verify ETA Updates

**Scenario**: Carrier updates ETA (delay detected)

```bash
# Check for ETA changes
psql delayguard_dev -c "
  SELECT o.order_number, o.original_eta, o.current_eta,
         EXTRACT(day FROM (o.current_eta - o.original_eta)) as delay_days
  FROM orders o
  WHERE o.tracking_status = 'IN_TRANSIT'
    AND o.current_eta <> o.original_eta;
"
```

**Expected output** (if delay occurred):
```
 order_number |     original_eta    |      current_eta     | delay_days
--------------+---------------------+----------------------+------------
 #1004        | 2025-12-01 00:00:00 | 2025-12-04 00:00:00 |          3
(1 row)
```

#### Step 6.5: Verify New Alert Created for ETA Delay

If ETA changed significantly (3+ days):

```bash
psql delayguard_dev -c "
  SELECT da.delay_reason, da.created_at
  FROM delay_alerts da
  JOIN orders o ON da.order_id = o.id
  WHERE o.order_number = '#1004'
  ORDER BY da.created_at DESC
  LIMIT 1;
"
```

**Expected output**:
```
   delay_reason   |       created_at
------------------+------------------------
 Extended Transit | 2025-11-29 11:00:15.234
(1 row)
```

**✅ PASS CRITERIA**: Cron job runs successfully, updates tracking data, creates alerts for new delays

---

### Test 7: Dashboard Metrics (Real Data)

**Objective**: Verify dashboard metrics use real SQL queries
**Data Points Tested**: #1-4
**Estimated Time**: 10 minutes

#### Step 7.1: Create Varied Test Data

**Summary of test data needed**:
- 5 total alerts created (from previous tests)
- 3 active alerts (orders still delayed)
- 2 resolved alerts (orders delivered)

**To create resolved alert**:

1. Take existing alert (e.g., from order #1001)
2. Update order status to DELIVERED:

```bash
psql delayguard_dev -c "
  UPDATE orders
  SET tracking_status = 'DELIVERED',
      updated_at = NOW()
  WHERE order_number = '#1001';
"
```

3. Delay alert should auto-resolve (if `auto_resolve_on_delivery` = true)

#### Step 7.2: Verify Dashboard API Response

```bash
curl http://localhost:3001/api/stats
```

**Expected response**:
```json
{
  "totalAlerts": 5,
  "activeAlerts": 3,
  "resolvedAlerts": 2,
  "avgResolutionTime": "2.5 days"
}
```

#### Step 7.3: Verify SQL Queries Execute

Check server logs:

```
📊 Fetching dashboard stats...
🔍 Query 1: Total alerts = 5
🔍 Query 2: Active alerts = 3
🔍 Query 3: Resolved alerts = 2
🔍 Query 4: Avg resolution time = 2.5 days
✅ Stats API response sent
```

#### Step 7.4: Verify UI Display - AppHeader

1. Go to DelayGuard app (any tab)
2. View header metrics at top of page
3. Verify:
   - ✅ Total Alerts: 5
   - ✅ Active: 3 (amber background)
   - ✅ Resolved: 2 (green background)
   - ✅ Avg Resolution Time: "2.5 days" (or "N/A" if no resolved alerts)

#### Step 7.5: Verify Metrics Update Dynamically

1. Resolve another alert manually:

```bash
psql delayguard_dev -c "
  UPDATE delay_alerts
  SET status = 'resolved', resolved_at = NOW()
  WHERE id = 'clp2b3c4d5e6f7g8h9i0';
"
```

2. Refresh DelayGuard UI
3. Verify header metrics updated:
   - ✅ Active: 2 (decreased by 1)
   - ✅ Resolved: 3 (increased by 1)

**✅ PASS CRITERIA**: Dashboard metrics show real-time data from database

---

## 7. Testing Uncertain Features

### 7.1 Merchant Benchmarks (❓ UNCERTAIN)

**Status**: UI exists, backend calculation not implemented yet
**Location**: Settings tab → SettingsCard → Benchmarks section

**Expected Behavior** (if implemented):
```
Merchant Benchmarks:
- Avg Fulfillment: 2.3 days
- Avg Delivery: 5.8 days
- Delays This Month: 12
- Trend: +15% (vs last month)
```

**Current Behavior**:
- [ ] Benchmarks display hardcoded values
- [ ] Benchmarks display "N/A" or hidden
- [ ] Benchmarks display real calculated values ✅ (if implemented)

**To Test** (if implemented):

```bash
# Check if benchmark calculation exists in API
curl http://localhost:3001/api/analytics/benchmarks
```

**Expected response** (if implemented):
```json
{
  "avgFulfillmentDays": 2.3,
  "avgDeliveryDays": 5.8,
  "delaysThisMonth": 12,
  "delaysTrend": "+15%"
}
```

**If NOT implemented**:
- Feature should be gracefully hidden or show "Coming Soon"
- No console errors should appear

---

### 7.2 Suggested Actions (❓ UNCERTAIN)

**Status**: Database field exists, generation logic not found
**Location**: AlertCard → "Suggested Actions" section

**Expected Behavior** (if implemented):
```
Suggested Actions:
1. Send Apology Email (HIGH)
   → Proactively reach out with delay explanation
2. Offer 10% Discount (MEDIUM)
   → Retain customer with apology discount code
```

**Current Behavior**:
- [ ] Section shows "No suggestions available"
- [ ] Section hidden entirely
- [ ] Suggestions display ✅ (if generation logic implemented)

**To Test** (if implemented):

```bash
# Check if suggested_actions field populated
psql delayguard_dev -c "
  SELECT suggested_actions
  FROM delay_alerts
  WHERE id = 'clp2b3c4d5e6f7g8h9i0';
"
```

**Expected output** (if implemented):
```json
{
  "actions": [
    {
      "id": "1",
      "title": "Send Apology Email",
      "description": "Proactively reach out with delay explanation",
      "priority": "high"
    }
  ]
}
```

**If NOT implemented**:
- AlertCard should gracefully hide the section
- No undefined errors in console

---

## 8. Common Issues & Troubleshooting

### Issue 1: Webhooks Not Received

**Symptoms**:
- Orders created in Shopify but don't appear in DelayGuard
- Server logs show no webhook events

**Diagnosis**:

1. **Check ngrok tunnel is running**:
   ```bash
   # In ngrok terminal, should show:
   Forwarding  https://abc123.ngrok.io -> http://localhost:3001
   ```

2. **Verify webhook URLs in Shopify Partner Dashboard**:
   - Go to Apps → Your App → API credentials
   - Check webhook subscriptions use correct ngrok URL

3. **Test webhook manually**:
   ```bash
   curl -X POST http://localhost:3001/api/webhooks/orders/create \
     -H "Content-Type: application/json" \
     -d '{"id":"gid://shopify/Order/123","name":"#TEST"}'
   ```

**Solutions**:

- **Restart ngrok** if URL changed (ngrok free tier randomizes URLs)
- **Update webhook URLs** in Shopify with new ngrok URL
- **Check firewall** isn't blocking port 3001
- **Verify server is running** on port 3001

---

### Issue 2: Database Connection Errors

**Symptoms**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Cannot connect to PostgreSQL database
```

**Diagnosis**:

```bash
# Check if PostgreSQL is running
pg_isready

# Check database exists
psql -l | grep delayguard_dev
```

**Solutions**:

```bash
# Start PostgreSQL service (macOS)
brew services start postgresql@14

# Start PostgreSQL service (Linux)
sudo systemctl start postgresql

# Create database if missing
createdb delayguard_dev

# Verify connection
psql delayguard_dev -c "SELECT NOW();"
```

---

### Issue 3: ShipEngine API Errors

**Symptoms**:
```
Error: ShipEngine API returned 401 Unauthorized
Unable to fetch tracking information
```

**Diagnosis**:

```bash
# Test ShipEngine API key
curl https://api.shipengine.com/v1/labels \
  -H "API-Key: your_shipengine_api_key_here"
```

**Expected response**: `200 OK` (even if empty results)

**Solutions**:

- **Verify API key** in `.env` file is correct
- **Check API key is active** in ShipEngine dashboard
- **Use sandbox environment** for testing (different API key)
- **Check rate limits** (ShipEngine free tier has limits)

---

### Issue 4: SendGrid Webhook Signature Verification Fails

**Symptoms**:
```
403 Forbidden - Invalid signature
SendGrid webhook rejected
```

**Diagnosis**:

```bash
# Check SENDGRID_WEBHOOK_SECRET in .env matches SendGrid dashboard
echo $SENDGRID_WEBHOOK_SECRET
```

**Solutions**:

- **Copy verification key** from SendGrid dashboard exactly
- **No extra spaces or quotes** in .env file
- **Restart server** after updating .env
- **Test with SendGrid's webhook testing tool** first

---

### Issue 5: OAuth Installation Loop

**Symptoms**:
- Click "Install app" in Shopify
- Redirects back to installation page
- Never completes OAuth flow

**Diagnosis**:

```bash
# Check server logs for OAuth errors
# Look for:
Error: Invalid redirect_uri
Error: Invalid API credentials
```

**Solutions**:

- **Verify redirect URI** in Partner Dashboard matches `.env` APP_URL
- **Check API key and secret** are correct
- **Clear browser cookies** for Shopify admin
- **Use incognito/private window** to test fresh installation

---

### Issue 6: Product Line Items Not Syncing

**Symptoms**:
- Orders appear in DelayGuard
- Product line items missing or show "No products"

**Diagnosis**:

```bash
# Check if GraphQL query is being called
# Server logs should show:
🔍 Fetching line items via GraphQL for order: gid://shopify/Order/123

# Check database
psql delayguard_dev -c "SELECT COUNT(*) FROM order_line_items;"
```

**Solutions**:

- **Verify `read_products` permission** is requested in OAuth scopes
- **Re-install app** if scope was added after installation
- **Check Shopify GraphQL query** for errors (401 = permission denied)
- **Verify products exist** in Shopify order

---

### Issue 7: Tracking Events Not Updating

**Symptoms**:
- Order fulfilled in Shopify
- Tracking number appears but no events
- Timeline section empty

**Diagnosis**:

```bash
# Check if ShipEngine API was called
# Server logs should show:
🚚 Calling ShipEngine API for tracking number: 9400100000000000000001

# Check tracking_events table
psql delayguard_dev -c "SELECT COUNT(*) FROM tracking_events;"
```

**Solutions**:

- **Use valid tracking number** (real or ShipEngine sandbox number)
- **Wait 24-48 hours** for real tracking numbers to have events
- **Use ShipEngine test tracking numbers** for immediate events:
  - USPS: `9400100000000000000000`
  - UPS: `1Z999AA10123456784`
- **Check ShipEngine carrier code** matches tracking number format

---

### Issue 8: Delay Alerts Not Creating

**Symptoms**:
- Orders clearly delayed (4+ days unfulfilled)
- No alerts appear in Alerts tab

**Diagnosis**:

```bash
# Manually trigger delay detection
curl http://localhost:3001/api/cron/check-delays

# Check delay detection logs
# Should show:
🔍 Running delay detection check...
📦 Checking X unfulfilled order(s)
```

**Solutions**:

- **Verify threshold settings** in database (default: 3 days for pre-shipment)
- **Check order created_at date** is actually old enough
- **Run delay detection manually** via API endpoint
- **Check cron job is scheduled** (vercel.json or equivalent)

---

## 9. Test Data Cleanup

### After Testing Complete

**⚠️ IMPORTANT**: Clean up test data before going to production!

### Step 9.1: Delete Test Orders from Database

```bash
# Delete all test data (CASCADE will delete related records)
psql delayguard_dev <<EOF
-- Delete test alerts (will delete related notifications)
DELETE FROM delay_alerts WHERE id IN (
  SELECT da.id FROM delay_alerts da
  JOIN orders o ON da.order_id = o.id
  WHERE o.order_number LIKE '#100%'
);

-- Delete test order line items
DELETE FROM order_line_items WHERE id IN (
  SELECT oli.id FROM order_line_items oli
  JOIN orders o ON oli.order_id = o.id
  WHERE o.order_number LIKE '#100%'
);

-- Delete test tracking events
DELETE FROM tracking_events WHERE id IN (
  SELECT te.id FROM tracking_events te
  JOIN orders o ON te.order_id = o.id
  WHERE o.order_number LIKE '#100%'
);

-- Delete test fulfillments
DELETE FROM fulfillments WHERE id IN (
  SELECT f.id FROM fulfillments f
  JOIN orders o ON f.order_id = o.id
  WHERE o.order_number LIKE '#100%'
);

-- Delete test orders
DELETE FROM orders WHERE order_number LIKE '#100%';

-- Verify cleanup
SELECT COUNT(*) as remaining_orders FROM orders;
EOF
```

**Expected output**:
```
 remaining_orders
------------------
                0
(1 row)
```

### Step 9.2: Delete Test Orders from Shopify

1. In Shopify Admin → **Orders**
2. Select all test orders (filter by customer "John Doe", "Jane Smith", etc.)
3. **Actions** → **Archive orders**
4. Navigate to **Archived orders**
5. Select all archived test orders
6. **Actions** → **Delete orders permanently**

### Step 9.3: Reset App Settings to Defaults

```bash
psql delayguard_dev -c "
  UPDATE app_settings
  SET
    pre_shipment_threshold_days = 3,
    in_transit_threshold_days = 5,
    extended_transit_threshold_days = 7,
    email_notifications = true,
    sms_notifications = false,
    auto_resolve_on_delivery = true,
    include_tracking_link = true
  WHERE shop_id IN (SELECT id FROM shops WHERE shop_domain LIKE '%test%');
"
```

### Step 9.4: Verify Database is Clean

```bash
# Should return 0 for all
psql delayguard_dev -c "
  SELECT
    (SELECT COUNT(*) FROM orders) as orders,
    (SELECT COUNT(*) FROM delay_alerts) as alerts,
    (SELECT COUNT(*) FROM order_line_items) as line_items,
    (SELECT COUNT(*) FROM tracking_events) as events,
    (SELECT COUNT(*) FROM notifications) as notifications;
"
```

**Expected output**:
```
 orders | alerts | line_items | events | notifications
--------+--------+------------+--------+---------------
      0 |      0 |          0 |      0 |             0
(1 row)
```

---

## 10. Production Deployment Checklist

### Before Deploying to Production

**Security**:
- [ ] Change all `.env` secrets (SESSION_SECRET, SENDGRID_WEBHOOK_SECRET)
- [ ] Use production Shopify API credentials (not test store)
- [ ] Use production ShipEngine API key
- [ ] Use production SendGrid API key
- [ ] Enable HTTPS only (no HTTP)
- [ ] Configure CORS to allow only your domain

**Database**:
- [ ] Create production PostgreSQL database
- [ ] Run database migrations (`connection.ts`)
- [ ] Set up automated backups (daily)
- [ ] Configure connection pooling for performance

**Hosting** (example: Vercel):
- [ ] Deploy app to Vercel (or preferred host)
- [ ] Configure environment variables in Vercel dashboard
- [ ] Set up custom domain (e.g., `app.delayguard.com`)
- [ ] Enable Vercel cron jobs for:
  - Tracking refresh: `0 * * * *` (hourly)
  - Delay detection: `*/30 * * * *` (every 30 minutes)

**Shopify App Listing**:
- [ ] Update app URLs to production domain
- [ ] Update webhook URLs to production domain
- [ ] Configure OAuth redirect URLs
- [ ] Submit app for Shopify App Store review
- [ ] Prepare marketing materials (screenshots, videos, description)

**Monitoring**:
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Configure uptime monitoring (Pingdom, UptimeRobot)
- [ ] Set up database query performance monitoring
- [ ] Create alerts for critical errors

**Testing**:
- [ ] Re-run all tests in production environment
- [ ] Test with real merchant store (not development store)
- [ ] Verify webhooks work with production URLs
- [ ] Test email delivery (SendGrid production API)
- [ ] Load test with 1000+ orders

**Documentation**:
- [ ] Update README with production deployment steps
- [ ] Document environment variables required
- [ ] Create merchant onboarding guide
- [ ] Prepare support documentation

---

## ✅ Testing Completion Checklist

**Basic Functionality**:
- [ ] Test 1: Order creation and sync ✅
- [ ] Test 2: Product line items sync ✅
- [ ] Test 3: ShipEngine tracking integration ✅
- [ ] Test 4: Delay detection and alerts ✅
- [ ] Test 5: Email engagement tracking ✅
- [ ] Test 6: Hourly tracking refresh cron ✅
- [ ] Test 7: Dashboard metrics (real data) ✅

**Uncertain Features**:
- [ ] Test 8: Merchant benchmarks (if implemented)
- [ ] Test 9: Suggested actions (if implemented)

**Edge Cases & Error Handling**:
- [ ] Missing product images (graceful degradation) ✅
- [ ] Missing customer phone (graceful degradation) ✅
- [ ] No tracking events yet (graceful degradation) ✅
- [ ] Empty suggested actions (graceful degradation) ✅
- [ ] Invalid webhook signatures (security) ✅
- [ ] Database connection failures (error handling)
- [ ] ShipEngine API rate limits (error handling)

**Performance & Scalability**:
- [ ] Test with 100+ orders
- [ ] Test with 10+ simultaneous webhooks
- [ ] Verify database indexes speed up queries
- [ ] Check cron jobs complete within 30 seconds

**Security**:
- [ ] SendGrid HMAC signature verification ✅
- [ ] Shopify webhook HMAC verification
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React escaping)

---

## 📚 Additional Resources

### Official Documentation
- **Shopify App Development**: https://shopify.dev/docs/apps
- **Shopify GraphQL API**: https://shopify.dev/docs/api/admin-graphql
- **ShipEngine API**: https://www.shipengine.com/docs/
- **SendGrid Event Webhook**: https://docs.sendgrid.com/for-developers/tracking-events/event
- **Vercel Cron Jobs**: https://vercel.com/docs/cron-jobs

### DelayGuard Internal Docs
- **[DATA_AVAILABILITY_ANALYSIS.md](DATA_AVAILABILITY_ANALYSIS.md)** - All 84 data points reference
- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** - Technical implementation details
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Phase completion status
- **[CLAUDE.md](CLAUDE.md)** - Development workflow and version history

### Community Support
- **Shopify Community**: https://community.shopify.com/
- **Shopify Partners Slack**: (invite from Partner Dashboard)

---

**Last Updated**: November 29, 2025
**Maintained By**: DelayGuard Development Team
**Questions?** Open an issue on GitHub or contact support@delayguard.app

---

**🎉 Happy Testing!** You're now ready to thoroughly test DelayGuard with a Shopify development store.
