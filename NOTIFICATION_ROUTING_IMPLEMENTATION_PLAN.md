# NOTIFICATION ROUTING & RECIPIENT MANAGEMENT - Implementation Plan
**Feature**: Smart notification routing (Merchant vs Customer) + Per-delay-type enable/disable controls  
**Priority**: PHASE 2 - Must complete before Shopify App Store submission  
**Estimated Effort**: 4-5 days  
**Created**: November 9, 2025  

---

## 🎯 PROBLEM STATEMENT

### Current State (CRITICAL ISSUES)
1. **Wrong notification recipients**: ALL delay notifications currently go to `customer_email` regardless of delay type
2. **No merchant contact info**: `shops` table lacks merchant email/phone fields
3. **No per-delay-type controls**: Merchants cannot disable specific delay types (all-or-nothing)
4. **Confusing UX**: UI doesn't clarify WHO receives which notifications

### What This Implementation Fixes
- ✅ **Warehouse delays** → Route to MERCHANT (internal operational issue)
- ✅ **Carrier/Transit delays** → Route to CUSTOMER (proactive communication)
- ✅ **Per-type enable/disable**: Each delay type can be independently enabled/disabled
- ✅ **Visual clarity**: Red "disabled" indicators, clear recipient explanations in UI
- ✅ **Merchant contact collection**: Fetch from Shopify API + manual entry UI

---

## 📋 REQUIREMENTS & ACCEPTANCE CRITERIA

### Requirement 1: Database Schema - Merchant Contact Info
**User Story**: As a merchant, I want my warehouse delay alerts sent to MY email/phone, not my customer's.

**Acceptance Criteria**:
- [ ] `shops` table has `merchant_email`, `merchant_phone`, `merchant_name` columns
- [ ] Migration is idempotent (uses `DO $$ IF NOT EXISTS`)
- [ ] OAuth callback fetches merchant email from Shopify API on app install
- [ ] Settings UI allows merchant to update their contact info
- [ ] 15+ database schema tests pass

---

### Requirement 2: Per-Delay-Type Enable/Disable Controls
**User Story**: As a merchant, I want to disable warehouse delay alerts because I fulfill same-day and never have delays.

**Acceptance Criteria**:
- [ ] `app_settings` table has `warehouse_delays_enabled`, `carrier_delays_enabled`, `transit_delays_enabled` BOOLEAN fields (default TRUE)
- [ ] Settings UI shows checkbox toggle for each delay type
- [ ] Disabled delay types show visual indicator (red badge "DISABLED", grayed-out inputs)
- [ ] Delay check processor skips detection for disabled types
- [ ] 20+ tests for enable/disable logic pass

---

### Requirement 3: Smart Notification Routing
**User Story**: As a customer, I want to be notified about carrier delays, but NOT about the merchant's warehouse issues (which don't concern me).

**Acceptance Criteria**:
- [ ] `addNotificationJob()` accepts `delayType` parameter
- [ ] `processNotification()` routes based on delay type:
  - `WAREHOUSE_DELAY` → merchant_email/merchant_phone
  - `CARRIER_DELAY` → customer_email/customer_phone
  - `STUCK_IN_TRANSIT` → customer_email/customer_phone
- [ ] Two separate email templates (merchant-facing vs customer-facing)
- [ ] 25+ notification routing tests pass

---

### Requirement 4: UI/UX Clarity & Visual Indicators
**User Story**: As a merchant, I want to clearly understand WHO will receive alerts for each delay type, and see at-a-glance which types are disabled.

**Acceptance Criteria**:
- [ ] Each delay rule accordion shows "📧 Who gets notified: YOU (merchant)" or "YOUR CUSTOMER"
- [ ] Visual callout card summarizes notification routing
- [ ] Disabled delay types show red "DISABLED" badge
- [ ] Disabled delay types gray out threshold inputs and disable accordions
- [ ] 18+ UI component tests pass

---

## 🗄️ DATABASE SCHEMA CHANGES

### Migration 1: Add Merchant Contact Fields to `shops` Table

```sql
-- File: src/database/connection.ts (add to setupDatabase())

-- Add merchant contact info columns
DO $$
BEGIN
  -- Add merchant_email column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='shops' AND column_name='merchant_email'
  ) THEN
    ALTER TABLE shops ADD COLUMN merchant_email VARCHAR(255);
  END IF;

  -- Add merchant_phone column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='shops' AND column_name='merchant_phone'
  ) THEN
    ALTER TABLE shops ADD COLUMN merchant_phone VARCHAR(255);
  END IF;

  -- Add merchant_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='shops' AND column_name='merchant_name'
  ) THEN
    ALTER TABLE shops ADD COLUMN merchant_name VARCHAR(255);
  END IF;
END $$;
```

**Tests Required** (15 tests):
1. Verify merchant_email column exists
2. Verify merchant_phone column exists
3. Verify merchant_name column exists
4. Verify columns accept NULL values (optional fields)
5. Verify merchant_email accepts valid email format
6. Verify merchant_phone accepts international formats (+1, +44, etc.)
7. Test idempotent migration (run twice, no errors)
8. Test INSERT with merchant fields
9. Test UPDATE merchant fields
10. Test SELECT merchant fields with JOIN
11. Test NULL handling for all 3 fields
12. Test VARCHAR(255) length limits
13. Test special characters in merchant_name
14. Test merchant_email unique constraint (if applicable)
15. Test cascade behavior with orders table

**File Location**: `src/tests/integration/database/merchant-contact-schema.test.ts`

---

### Migration 2: Add Enable/Disable Flags to `app_settings` Table

```sql
-- Add per-delay-type enable/disable flags
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='app_settings' AND column_name='warehouse_delays_enabled'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN warehouse_delays_enabled BOOLEAN DEFAULT TRUE;
    ALTER TABLE app_settings ADD COLUMN carrier_delays_enabled BOOLEAN DEFAULT TRUE;
    ALTER TABLE app_settings ADD COLUMN transit_delays_enabled BOOLEAN DEFAULT TRUE;
  END IF;
END $$;
```

**Tests Required** (12 tests):
1. Verify warehouse_delays_enabled column exists
2. Verify carrier_delays_enabled column exists
3. Verify transit_delays_enabled column exists
4. Verify default value is TRUE for all 3
5. Test UPDATE to FALSE
6. Test UPDATE to TRUE
7. Test SELECT with enable/disable flags
8. Test NULL handling (should not allow NULL, use DEFAULT)
9. Test type safety (only BOOLEAN values accepted)
10. Test idempotent migration
11. Test backward compatibility (existing records get TRUE defaults)
12. Test all 3 flags can be independently toggled

**File Location**: `src/tests/integration/database/delay-type-toggles-schema.test.ts`

---

## 🔧 BACKEND IMPLEMENTATION

### Phase 2.1: Shopify API Integration - Fetch Merchant Email

**File**: `src/routes/auth.ts` (OAuth callback)

**Implementation**:
```typescript
// After successful OAuth, fetch shop details
const shopQuery = `
  query {
    shop {
      email           # Shop owner's email (primary)
      contactEmail    # Public contact email (fallback)
      name            # Shop name
      myshopifyDomain # Store domain
      currencyCode    # Currency
    }
  }
`;

const shopifyClient = new shopify.clients.Graphql({
  session: session,
});

const shopResponse = await shopifyClient.query({
  data: shopQuery,
});

const shopData = shopResponse.body.data.shop;

// Store merchant email in database
await query(
  `UPDATE shops 
   SET merchant_email = $1, 
       merchant_name = $2 
   WHERE shop_domain = $3`,
  [
    shopData.email || shopData.contactEmail, // Use email if available, fallback to contactEmail
    shopData.name,
    session.shop
  ]
);
```

**Tests Required** (10 tests):
1. Test successful merchant email fetch from Shopify API
2. Test fallback to contactEmail if email is null
3. Test merchant_name storage
4. Test UPDATE query executes successfully
5. Test OAuth flow with merchant email fetch
6. Test API error handling (Shopify API down)
7. Test null email handling (edge case)
8. Test special characters in merchant_name
9. Test merchant email format validation
10. Test duplicate shop_domain handling

**File Location**: `src/tests/integration/auth/merchant-email-fetch.test.ts`

---

### Phase 2.2: Update Delay Check Processor - Add `delayType` Parameter

**File**: `src/queue/processors/delay-check.ts`

**Current Code** (lines 126-136):
```typescript
await addNotificationJob({
  orderId: parseInt(order.id),
  delayDetails: {
    estimatedDelivery: triggeredDelayResult.estimatedDelivery || '',
    trackingNumber: trackingNumber || '',
    trackingUrl: trackingInfo?.trackingUrl || `https://tracking.example.com/${trackingNumber || 'unknown'}`,
    delayDays: triggeredDelayResult.delayDays || 0,
    delayReason: triggeredDelayResult.delayReason || 'UNKNOWN',
  },
  shopDomain,
});
```

**NEW Code**:
```typescript
// Check if this delay type is enabled before sending notification
const delayType = triggeredDelayResult.delayReason; // 'WAREHOUSE_DELAY' | 'CARRIER_DELAY' | 'STUCK_IN_TRANSIT'
let isDelayTypeEnabled = true;

if (delayType === 'WAREHOUSE_DELAY' && !order.warehouse_delays_enabled) {
  isDelayTypeEnabled = false;
  logger.info(`⏭️ Warehouse delays disabled for shop, skipping notification`);
}
if (delayType === 'CARRIER_DELAY' && !order.carrier_delays_enabled) {
  isDelayTypeEnabled = false;
  logger.info(`⏭️ Carrier delays disabled for shop, skipping notification`);
}
if (delayType === 'STUCK_IN_TRANSIT' && !order.transit_delays_enabled) {
  isDelayTypeEnabled = false;
  logger.info(`⏭️ Transit delays disabled for shop, skipping notification`);
}

// Only send notification if delay type is enabled
if (delayDetected && triggeredDelayResult && isDelayTypeEnabled && (order.email_enabled || order.sms_enabled)) {
  await addNotificationJob({
    orderId: parseInt(order.id),
    delayType: delayType, // NEW: Pass delay type for routing
    delayDetails: {
      estimatedDelivery: triggeredDelayResult.estimatedDelivery || '',
      trackingNumber: trackingNumber || '',
      trackingUrl: trackingInfo?.trackingUrl || `https://tracking.example.com/${trackingNumber || 'unknown'}`,
      delayDays: triggeredDelayResult.delayDays || 0,
      delayReason: delayType,
    },
    shopDomain,
  });
}
```

**Update SQL Query** (lines 22-33):
```typescript
const orderResult = await query(
  `SELECT o.*,
          s.warehouse_delay_days,
          s.carrier_delay_days,
          s.transit_delay_days,
          s.warehouse_delays_enabled,    -- NEW
          s.carrier_delays_enabled,      -- NEW
          s.transit_delays_enabled,      -- NEW
          s.email_enabled,
          s.sms_enabled,
          s.merchant_email,              -- NEW
          s.merchant_phone,              -- NEW
          s.merchant_name                -- NEW
   FROM orders o
   JOIN shops s ON o.shop_id = s.id
   WHERE o.id = $1`,
  [orderId],
);
```

**Update Interface** (lines 39-55):
```typescript
const order = orderResult[0] as {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  created_at: Date;
  tracking_status: string | null;
  last_tracking_update: Date | null;
  tracking_number: string;
  carrier_code: string;
  warehouse_delay_days: number;
  carrier_delay_days: number;
  transit_delay_days: number;
  warehouse_delays_enabled: boolean;  // NEW
  carrier_delays_enabled: boolean;    // NEW
  transit_delays_enabled: boolean;    // NEW
  email_enabled: boolean;
  sms_enabled: boolean;
  merchant_email: string | null;      // NEW
  merchant_phone: string | null;      // NEW
  merchant_name: string | null;       // NEW
};
```

**Tests Required** (18 tests):
1. Test warehouse delay skipped when `warehouse_delays_enabled = false`
2. Test carrier delay skipped when `carrier_delays_enabled = false`
3. Test transit delay skipped when `transit_delays_enabled = false`
4. Test warehouse delay sent when `warehouse_delays_enabled = true`
5. Test carrier delay sent when `carrier_delays_enabled = true`
6. Test transit delay sent when `transit_delays_enabled = true`
7. Test delayType parameter passed correctly
8. Test merchant_email fetched from shops table
9. Test merchant_phone fetched from shops table
10. Test SQL query with new columns
11. Test interface type safety
12. Test null merchant contact fields
13. Test all 3 delay types disabled simultaneously
14. Test mixed enable/disable states
15. Test logger messages for skipped delays
16. Test notification job NOT added when disabled
17. Test notification job added when enabled
18. Test backward compatibility (NULL enable flags treated as TRUE)

**File Location**: `src/tests/unit/queue/delay-check-with-toggles.test.ts`

---

### Phase 2.3: Smart Notification Routing - Update Notification Processor

**File**: `src/queue/processors/notification.ts`

**Update Interface** (lines 9-19):
```typescript
interface NotificationJobData {
  orderId: number;
  delayType: 'WAREHOUSE_DELAY' | 'CARRIER_DELAY' | 'STUCK_IN_TRANSIT'; // NEW
  delayDetails: {
    estimatedDelivery: string;
    trackingNumber: string;
    trackingUrl: string;
    delayDays: number;
    delayReason: string;
  };
  shopDomain: string;
}
```

**Update Routing Logic** (lines 82-131):
```typescript
// Prepare order info
const orderInfo = {
  id: order.shopify_order_id,
  orderNumber: order.order_number,
  customerName: order.customer_name,
  customerEmail: order.customer_email,
  customerPhone: order.customer_phone,
  shopDomain: order.shop_domain,
  createdAt: new Date(order.created_at),
};

// NEW: Fetch merchant contact info from shops table
const shopResult = await query(
  `SELECT merchant_email, merchant_phone, merchant_name FROM shops WHERE shop_domain = $1`,
  [order.shop_domain],
);

if (shopResult.length === 0) {
  throw new Error(`Shop ${order.shop_domain} not found`);
}

const merchantInfo = shopResult[0] as {
  merchant_email: string | null;
  merchant_phone: string | null;
  merchant_name: string | null;
};

// NEW: Determine recipient based on delay type
let recipientEmail: string | null = null;
let recipientPhone: string | null = null;
let recipientName: string | null = null;
let emailTemplate: 'MERCHANT_ALERT' | 'CUSTOMER_ALERT';

if (delayType === 'WAREHOUSE_DELAY') {
  // Route to MERCHANT for warehouse delays
  recipientEmail = merchantInfo.merchant_email;
  recipientPhone = merchantInfo.merchant_phone;
  recipientName = merchantInfo.merchant_name || 'Merchant';
  emailTemplate = 'MERCHANT_ALERT';
  logger.info(`📧 Routing warehouse delay alert to MERCHANT: ${recipientEmail}`);
} else {
  // Route to CUSTOMER for carrier/transit delays
  recipientEmail = order.customer_email;
  recipientPhone = order.customer_phone;
  recipientName = order.customer_name;
  emailTemplate = 'CUSTOMER_ALERT';
  logger.info(`📧 Routing ${delayType} alert to CUSTOMER: ${recipientEmail}`);
}

// Validate recipient exists
if (!recipientEmail && order.email_enabled) {
  logger.warn(`⚠️ No recipient email found for ${delayType} notification (order ${orderId})`);
  // Don't throw error, just log and skip
  return;
}

// Send notifications based on settings and what hasn't been sent
const promises: Promise<void>[] = [];

if (order.email_enabled && recipientEmail && !alert.email_sent) {
  promises.push(
    notificationService.sendDelayNotification(
      {
        ...orderInfo,
        customerEmail: recipientEmail, // Override with correct recipient
        customerName: recipientName,
      },
      delayDetails,
      emailTemplate // NEW: Pass template type
    )
      .then(async() => {
        await query(
          `UPDATE delay_alerts SET email_sent = TRUE WHERE order_id = $1`,
          [orderId],
        );
        logger.info(`✅ Email sent for order ${orderId} (template: ${emailTemplate})`);
      })
      .catch(error => {
        logger.error('Error sending email notification', error as Error);
        throw error;
      }),
  );
}

if (order.sms_enabled && recipientPhone && !alert.sms_sent) {
  promises.push(
    notificationService.sendDelayNotification(
      {
        ...orderInfo,
        customerPhone: recipientPhone, // Override with correct recipient
        customerName: recipientName,
      },
      delayDetails,
      emailTemplate // NEW: Pass template type
    )
      .then(async() => {
        await query(
          `UPDATE delay_alerts SET sms_sent = TRUE WHERE order_id = $1`,
          [orderId],
        );
        logger.info(`✅ SMS sent for order ${orderId} (template: ${emailTemplate})`);
      })
      .catch(error => {
        logger.error('Error sending SMS notification', error as Error);
        throw error;
      }),
  );
}
```

**Tests Required** (25 tests):
1. Test warehouse delay routes to merchant_email
2. Test warehouse delay routes to merchant_phone
3. Test carrier delay routes to customer_email
4. Test carrier delay routes to customer_phone
5. Test transit delay routes to customer_email
6. Test transit delay routes to customer_phone
7. Test MERCHANT_ALERT template used for warehouse delays
8. Test CUSTOMER_ALERT template used for carrier/transit delays
9. Test null merchant_email handling (warn + skip)
10. Test null customer_email handling (warn + skip)
11. Test merchant_name fallback to "Merchant"
12. Test SQL query fetches merchant info
13. Test recipient override logic
14. Test logger messages show correct routing
15. Test email sent with correct recipient
16. Test SMS sent with correct recipient
17. Test mixed email/SMS settings
18. Test notification skipped when no recipient
19. Test error handling when shop not found
20. Test interface type safety for NotificationJobData
21. Test delayType parameter validation
22. Test backward compatibility (missing delayType treated as CUSTOMER_ALERT)
23. Test all 3 delay types route correctly
24. Test concurrent notifications (multiple delay types)
25. Test email_sent/sms_sent flags updated correctly

**File Location**: `src/tests/unit/queue/notification-routing.test.ts`

---

### Phase 2.4: Email Templates - Create 2 Separate Templates

**File**: `src/services/email-service.ts`

**Template 1: Merchant Alert** (warehouse delays)
```typescript
const MERCHANT_ALERT_TEMPLATE = `
Subject: ⚠️ Order #{orderNumber} Stuck in Warehouse - Action Required

Hi {merchantName},

Order #{orderNumber} has been unfulfilled for {delayDays} days.

🔍 Investigation checklist:
• Check inventory levels for ordered items
• Review picking queue for bottlenecks
• Contact fulfillment team about this order
• Verify customer address is complete

📦 Order Details:
• Order Number: #{orderNumber}
• Customer: {customerName}
• Days Unfulfilled: {delayDays}
• Order Date: {orderDate}

🔗 View in Shopify Admin: {shopifyAdminUrl}

Time to investigate this before the customer reaches out!

Best,
DelayGuard Monitoring System
`;
```

**Template 2: Customer Alert** (carrier/transit delays)
```typescript
const CUSTOMER_ALERT_TEMPLATE = `
Subject: Update on Your Order #{orderNumber} from {shopName}

Hi {customerName},

We wanted to reach out about your order from {shopName}.

{delayReasonMessage}

📦 Order Status:
• Order Number: #{orderNumber}
• Current Status: {trackingStatus}
• Delay Reason: {delayReason}
• Days in Transit: {delayDays}
{estimatedDelivery}

🔗 Track Your Package: {trackingUrl}

We're monitoring this closely and will keep you updated. If you have any questions, please reply to this email.

Thanks for your patience,
{shopName} Team

---
Powered by DelayGuard
`;
```

**Update NotificationService Interface**:
```typescript
export class NotificationService {
  async sendDelayNotification(
    orderInfo: OrderInfo,
    delayDetails: DelayDetails,
    template: 'MERCHANT_ALERT' | 'CUSTOMER_ALERT' // NEW parameter
  ): Promise<void> {
    if (template === 'MERCHANT_ALERT') {
      return this.sendMerchantAlert(orderInfo, delayDetails);
    } else {
      return this.sendCustomerAlert(orderInfo, delayDetails);
    }
  }

  private async sendMerchantAlert(...) { ... }
  private async sendCustomerAlert(...) { ... }
}
```

**Tests Required** (15 tests):
1. Test MERCHANT_ALERT template renders correctly
2. Test CUSTOMER_ALERT template renders correctly
3. Test merchant name substitution
4. Test customer name substitution
5. Test order number substitution
6. Test delay days substitution
7. Test delay reason message substitution
8. Test Shopify admin URL generation
9. Test tracking URL substitution
10. Test shop name substitution
11. Test template selection based on delayType
12. Test subject line formatting
13. Test special characters in names
14. Test null field handling
15. Test template sends via SendGrid API

**File Location**: `src/tests/unit/services/email-templates.test.ts`

---

## 🎨 FRONTEND IMPLEMENTATION

### Phase 2.5: Settings UI - Merchant Contact Preferences Section

**File**: `src/components/tabs/DashboardTab/SettingsCard.tsx`

**New Section** (add after line 319):
```tsx
{/* Merchant Contact Preferences Section */}
<div className={styles.section}>
  <h3 className={styles.sectionTitle}>Merchant Contact Preferences</h3>
  <p className={styles.sectionSubtitle}>
    Where should we send <strong>warehouse delay alerts</strong>? 
    (Carrier & transit alerts go to your customers)
  </p>

  <div className={styles.merchantContactForm}>
    <div className={styles.formField}>
      <label htmlFor="merchant-email" className={styles.label}>
        Your Email <span className={styles.required}>*</span>
      </label>
      <input
        id="merchant-email"
        type="email"
        className={styles.input}
        value={settings.merchantEmail || ''}
        onChange={(e) => onSettingsChange({ ...settings, merchantEmail: e.target.value })}
        placeholder="you@yourbusiness.com"
        required
      />
      <p className={styles.helpText}>
        💡 Warehouse delay alerts will be sent here, not to your customers
      </p>
    </div>

    <div className={styles.formField}>
      <label htmlFor="merchant-phone" className={styles.label}>
        Your Phone <span className={styles.optional}>(optional)</span>
      </label>
      <input
        id="merchant-phone"
        type="tel"
        className={styles.input}
        value={settings.merchantPhone || ''}
        onChange={(e) => onSettingsChange({ ...settings, merchantPhone: e.target.value })}
        placeholder="+1 (555) 123-4567"
      />
      <p className={styles.helpText}>
        📱 For urgent warehouse alerts via SMS
      </p>
    </div>

    <div className={styles.statusMessage}>
      {settings.merchantEmail ? (
        <span className={styles.statusSuccess}>
          ✅ Warehouse delay alerts will be sent to {settings.merchantEmail}
        </span>
      ) : (
        <span className={styles.statusWarning}>
          ⚠️ Please add your email to receive warehouse delay alerts
        </span>
      )}
    </div>
  </div>
</div>
```

**Tests Required** (12 tests):
1. Test merchant email input renders
2. Test merchant phone input renders
3. Test email onChange handler
4. Test phone onChange handler
5. Test required field indicator
6. Test optional field indicator
7. Test placeholder text
8. Test help text displays
9. Test success status message (email exists)
10. Test warning status message (email missing)
11. Test email validation (invalid format)
12. Test phone validation (invalid format)

**File Location**: `src/tests/unit/components/MerchantContactForm.test.tsx`

---

### Phase 2.6: Settings UI - Enable/Disable Toggles for Each Delay Type

**File**: `src/components/tabs/DashboardTab/SettingsCard.tsx`

**Update Rule 1 - Warehouse Delays** (lines 123-179):
```tsx
{/* Rule 1: Warehouse Delays */}
<div className={`${styles.ruleCard} ${!settings.warehouseDelaysEnabled ? styles.ruleCardDisabled : ''}`}>
  <div className={styles.ruleHeader}>
    <span className={styles.ruleIcon}>📦</span>
    <h4 className={styles.ruleTitle}>
      Warehouse Delays
      {!settings.warehouseDelaysEnabled && (
        <span className={styles.disabledBadge}>DISABLED</span>
      )}
    </h4>
    <label className={styles.enableToggle}>
      <input
        type="checkbox"
        checked={settings.warehouseDelaysEnabled}
        onChange={(e) => onSettingsChange({ ...settings, warehouseDelaysEnabled: e.target.checked })}
        aria-label="Enable warehouse delay detection"
      />
      <span className={styles.toggleLabel}>
        {settings.warehouseDelaysEnabled ? 'Enabled' : 'Disabled'}
      </span>
    </label>
  </div>

  {settings.warehouseDelaysEnabled ? (
    <>
      <div className={styles.ruleSetting}>
        <label htmlFor="delay-threshold" className={styles.ruleLabel}>
          Alert me when orders sit unfulfilled for:
        </label>
        <div className={styles.inputGroup}>
          <input
            id="delay-threshold"
            type="number"
            className={styles.input}
            value={localDelayThreshold}
            onChange={(e) => handleDelayThresholdChange(parseInt(e.target.value) || 0)}
            min="0"
            max="30"
            disabled={loading}
          />
          <span className={styles.inputSuffix}>days</span>
        </div>
      </div>
      
      <Accordion title="💡 Learn More About Warehouse Delays" className={styles.ruleAccordion}>
        {/* ... existing accordion content ... */}
        
        {/* NEW: Add recipient clarification */}
        <p className={styles.explanationTitle}>
          <strong>📧 Who gets notified:</strong>
        </p>
        <p className={styles.explanationText}>
          <strong>YOU (the merchant)</strong> receive these alerts, not your customer. 
          Since the order hasn&apos;t shipped yet, this is an internal operational issue 
          for you to investigate and resolve.
        </p>
        <p className={styles.explanationNote}>
          <em>💡 Configure your notification preferences in the "Merchant Contact Preferences" section below.</em>
        </p>
      </Accordion>
      
      {benchmarks && (
        <div className={styles.benchmarkContainer}>
          {renderBenchmark(benchmarks.avgFulfillmentDays, 'Your avg fulfillment time')}
        </div>
      )}
    </>
  ) : (
    <div className={styles.disabledMessage}>
      <p>⏸️ Warehouse delay detection is currently disabled.</p>
      <p>Enable it above to detect orders stuck in your warehouse before shipping.</p>
    </div>
  )}
</div>
```

**Repeat for Rule 2 & 3** with:
- `settings.carrierDelaysEnabled`
- `settings.transitDelaysEnabled`
- Appropriate disable messages
- Recipient clarification: "YOUR CUSTOMER receives these alerts"

**CSS Styles** (add to SettingsCard.module.css):
```css
.ruleCardDisabled {
  opacity: 0.6;
  background-color: #f9f9f9;
  border: 2px solid #e0e0e0;
}

.disabledBadge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  background-color: #dc3545;
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
  border-radius: 4px;
  text-transform: uppercase;
}

.enableToggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  cursor: pointer;
}

.toggleLabel {
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
}

.disabledMessage {
  padding: 1.5rem;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  text-align: center;
}

.disabledMessage p {
  margin: 0.5rem 0;
  color: #856404;
}
```

**Tests Required** (22 tests):
1. Test warehouse delay enable toggle renders
2. Test carrier delay enable toggle renders
3. Test transit delay enable toggle renders
4. Test toggle onChange handler (warehouse)
5. Test toggle onChange handler (carrier)
6. Test toggle onChange handler (transit)
7. Test DISABLED badge shows when disabled
8. Test DISABLED badge hidden when enabled
9. Test rule card has disabled class when disabled
10. Test threshold input disabled when rule disabled
11. Test accordion disabled when rule disabled
12. Test disabled message shows when disabled
13. Test disabled message hidden when enabled
14. Test all 3 rules can be independently toggled
15. Test toggle label changes (Enabled/Disabled)
16. Test visual styling (opacity, background color)
17. Test recipient clarification text shows
18. Test merchant vs customer distinction clear
19. Test CSS classes applied correctly
20. Test accessibility (aria-label on toggle)
21. Test keyboard navigation (Tab, Space)
22. Test mobile responsiveness

**File Location**: `src/tests/unit/components/DelayTypeToggles.test.tsx`

---

### Phase 2.7: Settings UI - Visual Callout Card (Notification Routing Summary)

**File**: `src/components/tabs/DashboardTab/SettingsCard.tsx`

**New Component** (add before "Smart Tip" section, line 309):
```tsx
{/* Notification Recipients Summary Card */}
<div className={styles.notificationRecipientsCard}>
  <div className={styles.recipientsHeader}>
    <h4 className={styles.recipientsTitle}>📬 Who Receives Alerts?</h4>
    <p className={styles.recipientsSubtitle}>
      Different delay types notify different people
    </p>
  </div>

  <div className={styles.recipientsList}>
    <div className={styles.recipientRow}>
      <span className={styles.recipientIcon}>🏭</span>
      <div className={styles.recipientInfo}>
        <strong>Warehouse Delays</strong>
        <span className={styles.recipientArrow}>→</span>
        <span className={styles.recipientTarget}>Alerts sent to <strong>YOU</strong> (merchant)</span>
        <p className={styles.recipientReason}>
          These are internal issues for you to investigate
        </p>
      </div>
    </div>

    <div className={styles.recipientRow}>
      <span className={styles.recipientIcon}>🚚</span>
      <div className={styles.recipientInfo}>
        <strong>Carrier & Transit Delays</strong>
        <span className={styles.recipientArrow}>→</span>
        <span className={styles.recipientTarget}>Alerts sent to <strong>CUSTOMER</strong></span>
        <p className={styles.recipientReason}>
          Proactive communication about shipping issues
        </p>
      </div>
    </div>
  </div>

  <div className={styles.recipientsFooter}>
    💡 <strong>Tip:</strong> Configure your contact info in "Merchant Contact Preferences" above
  </div>
</div>
```

**CSS Styles** (add to SettingsCard.module.css):
```css
.notificationRecipientsCard {
  margin: 2rem 0;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.recipientsHeader {
  text-align: center;
  margin-bottom: 1.5rem;
}

.recipientsTitle {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.recipientsSubtitle {
  font-size: 0.875rem;
  opacity: 0.9;
  margin: 0;
}

.recipientsList {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recipientRow {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  backdrop-filter: blur(10px);
}

.recipientIcon {
  font-size: 2rem;
  flex-shrink: 0;
}

.recipientInfo {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.recipientInfo strong {
  font-size: 1rem;
  font-weight: 600;
}

.recipientArrow {
  margin: 0 0.5rem;
  font-size: 1.25rem;
}

.recipientTarget {
  font-size: 0.875rem;
  font-weight: 500;
}

.recipientReason {
  font-size: 0.8rem;
  opacity: 0.8;
  margin: 0.5rem 0 0 0;
}

.recipientsFooter {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  text-align: center;
  font-size: 0.875rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .recipientRow {
    flex-direction: column;
    text-align: center;
  }
  
  .recipientIcon {
    align-self: center;
  }
}
```

**Tests Required** (10 tests):
1. Test notification recipients card renders
2. Test warehouse delay row shows "YOU (merchant)"
3. Test carrier/transit row shows "CUSTOMER"
4. Test icons display correctly
5. Test arrow symbols display
6. Test footer tip displays
7. Test CSS gradient background
8. Test backdrop blur effect
9. Test mobile responsive layout
10. Test accessibility (semantic HTML)

**File Location**: `src/tests/unit/components/NotificationRecipientsCard.test.tsx`

---

## 📦 TYPE DEFINITIONS

### Update AppSettings Interface

**File**: `src/types/index.ts`

**Add New Fields**:
```typescript
export interface AppSettings {
  // ... existing fields ...
  
  // NEW: Merchant contact info
  merchantEmail?: string | null;
  merchantPhone?: string | null;
  merchantName?: string | null;
  
  // NEW: Per-delay-type enable/disable toggles
  warehouseDelaysEnabled: boolean;
  carrierDelaysEnabled: boolean;
  transitDelaysEnabled: boolean;
}
```

---

## 🧪 TESTING STRATEGY

### Test Coverage Requirements
- **Database Schema**: 27 tests (15 merchant contact + 12 toggles)
- **Backend Logic**: 71 tests (10 Shopify API + 18 delay check + 25 notification routing + 15 templates + 3 integration)
- **Frontend Components**: 56 tests (12 merchant form + 22 toggles + 10 recipients card + 12 integration)
- **TOTAL**: **154 tests** (all must pass before deployment)

### TDD Workflow (RED → GREEN → REFACTOR)
1. **Write tests FIRST** for each phase
2. **Run tests** → See them fail (RED)
3. **Implement feature** → Make tests pass (GREEN)
4. **Refactor** → Improve code quality
5. **Re-run tests** → Ensure still passing
6. **Update docs** → IMPLEMENTATION_PLAN.md, CHANGELOG.md

---

## 📝 DOCUMENTATION UPDATES

### Files to Update After Completion
1. **CHANGELOG.md**: Add v1.21 entry with all changes
2. **PROJECT_OVERVIEW.md**: Update Phase 2 completion status
3. **IMPLEMENTATION_PLAN.md**: Mark Phase 2 as complete
4. **PROJECT_STATUS_AND_NEXT_STEPS.md**: Update current status

---

## 🚀 DEPLOYMENT CHECKLIST

Before marking Phase 2 complete:

- [ ] All 154 tests passing (100% pass rate)
- [ ] Zero linting errors in modified files
- [ ] Zero TypeScript compilation errors
- [ ] Database migrations tested on staging
- [ ] Shopify API integration tested with real shop
- [ ] Email templates tested with SendGrid
- [ ] SMS templates tested with Twilio
- [ ] UI tested on desktop, tablet, mobile
- [ ] Accessibility audit passed (keyboard navigation, screen readers)
- [ ] "Are you 100% sure?" review completed
- [ ] All documentation updated
- [ ] Git commit with detailed message
- [ ] Staging deployment successful
- [ ] User acceptance testing complete

---

## 💡 IMPLEMENTATION NOTES

### Critical Success Factors
1. **TDD Discipline**: Write ALL tests FIRST before implementation
2. **Database Safety**: Use idempotent migrations, test rollback
3. **Backward Compatibility**: Handle null merchant contact fields gracefully
4. **Error Handling**: Don't break notification flow if recipient missing
5. **Visual Clarity**: Make enable/disable states OBVIOUS (red badges, grayed out)
6. **User Education**: Clear explanations of WHO gets notified and WHY

### Common Pitfalls to Avoid
- ❌ Implementing before writing tests (TDD violation)
- ❌ Forgetting to handle NULL merchant contact fields
- ❌ Not testing all 8 combinations of enable/disable states (2³)
- ❌ Breaking existing notification flow for customers
- ❌ Forgetting to update interface types
- ❌ Not testing Shopify API errors/timeouts
- ❌ Skipping mobile responsive testing
- ❌ Not documenting changes in all 4 .md files

---

## 📅 ESTIMATED TIMELINE

**Total Effort**: 4-5 days

### Day 1: Database & Backend Foundation
- Morning: Database schema migrations (Phase 2.1)
- Afternoon: Shopify API integration (Phase 2.1)
- Tests: 25 tests written and passing

### Day 2: Delay Check Processor Updates
- Morning: Add delayType parameter and enable/disable logic (Phase 2.2)
- Afternoon: Test all enable/disable combinations
- Tests: 18 tests written and passing

### Day 3: Notification Routing Logic
- Morning: Smart routing implementation (Phase 2.3)
- Afternoon: Email template creation (Phase 2.4)
- Tests: 40 tests written and passing

### Day 4: Frontend UI Implementation
- Morning: Merchant contact form (Phase 2.5)
- Afternoon: Enable/disable toggles (Phase 2.6)
- Tests: 34 tests written and passing

### Day 5: Polish, Testing & Documentation
- Morning: Visual callout card (Phase 2.7)
- Afternoon: Integration testing, documentation updates
- Tests: 37 remaining tests + integration tests
- Final: "Are you 100% sure?" review and git commit

---

*Implementation plan created: November 9, 2025*  
*Next review: After Phase 2 completion*  
*For questions: See [CLAUDE.md](CLAUDE.md) for TDD workflow guidance*
