# Demo Data Seed Script

## Purpose
Creates realistic demo data for Shopify App Store screenshots and demos.

## What Gets Created

### 6 Demo Orders with Full Data:
- **3 Active Alerts**: CRITICAL, HIGH, and MEDIUM priority delays
- **1 Resolved Alert**: Was delayed, now back on track
- **1 Dismissed Alert**: Merchant contacted customer
- **1 Low Priority**: Minimal delay

### For Each Order:
✅ Customer information (name, email, phone)
✅ 1-3 realistic product line items (electronics, apparel, home goods, etc.)
✅ Tracking events timeline (picked up → in transit → exceptions)
✅ Original ETA vs Current ETA (for delay calculation)
✅ Email engagement tracking (opened/clicked status)
✅ Priority badges (CRITICAL/HIGH/MEDIUM/LOW)

### Data Variety:
- Order values: $49.99 - $584.99
- Delay lengths: 2-8 days
- Carriers: UPS, FedEx, USPS
- Product types: Electronics, Apparel, Home goods, Sports, Accessories
- Email statuses: Sent, Opened, Clicked, Not opened

## Usage

### 1. Ensure Database is Running
```bash
# Check PostgreSQL is running
pg_isready

# Or start it
brew services start postgresql@15
```

### 2. Run the Seed Script
```bash
# From delayguard-app directory
cd /Users/jooniekwun/Documents/DelayGuard/delayguard-app

# Run seed script
DATABASE_URL="postgresql://localhost:5432/delayguard_dev" npx ts-node src/scripts/seed-demo-data.ts
```

### 3. Start Dev Server
```bash
npm run dev
```

### 4. View Demo Data
- Dashboard: http://localhost:3000/dashboard
- Alerts: http://localhost:3000/alerts (filter by Active/Resolved/Dismissed)
- Orders: http://localhost:3000/orders (filter by Processing/Shipped/Delivered)

## Expected Output

```
🌱 Starting demo data seed...

1. Creating demo shop...
   ✅ Shop created with ID: 1

2. Creating demo orders with products and tracking...
   ✅ #1847 - Sarah Chen (active)
   ✅ #1848 - Michael Rodriguez (active)
   ✅ #1849 - Emily Johnson (active)
   ✅ #1845 - David Park (resolved)
   ✅ #1843 - Lisa Thompson (dismissed)
   ✅ #1850 - James Wilson (active)

3. Summary:
   📦 Orders created: 6
   🛍️  Products added: 14
   📍 Tracking events: 18
   🚨 Delay alerts: 6
   ✅ Active alerts: 4
   ✅ Resolved alerts: 1
   ❌ Dismissed alerts: 1

✅ Demo data seed complete!
```

## Cleaning Up

To remove demo data and start fresh:

```bash
DATABASE_URL="postgresql://localhost:5432/delayguard_dev" psql -c "
  DELETE FROM tracking_events WHERE order_id IN (SELECT id FROM orders WHERE shop_id IN (SELECT id FROM shops WHERE shop_domain = 'demo-store.myshopify.com'));
  DELETE FROM order_line_items WHERE order_id IN (SELECT id FROM orders WHERE shop_id IN (SELECT id FROM shops WHERE shop_domain = 'demo-store.myshopify.com'));
  DELETE FROM delay_alerts WHERE order_id IN (SELECT id FROM orders WHERE shop_id IN (SELECT id FROM shops WHERE shop_domain = 'demo-store.myshopify.com'));
  DELETE FROM fulfillments WHERE order_id IN (SELECT id FROM orders WHERE shop_id IN (SELECT id FROM shops WHERE shop_domain = 'demo-store.myshopify.com'));
  DELETE FROM orders WHERE shop_id IN (SELECT id FROM shops WHERE shop_domain = 'demo-store.myshopify.com');
  DELETE FROM shops WHERE shop_domain = 'demo-store.myshopify.com';
"
```

Or simply re-run the seed script (it uses ON CONFLICT DO UPDATE for the shop).

## Screenshot Tips

After seeding data, for best screenshots:

1. **Dashboard Tab**: Shows settings with reasonable delay thresholds
2. **Alerts Tab - Active**: Should show 4 active alerts with variety of priorities
3. **Alerts Tab - Resolved**: Shows 1 resolved alert (green checkmark)
4. **Alerts Tab - Dismissed**: Shows 1 dismissed alert
5. **Orders Tab**: Shows mix of order statuses

Each AlertCard should display:
- ✅ Customer info (name, email, phone)
- ✅ Order total with priority badge
- ✅ Product line items (title, SKU, quantity, price)
- ✅ Tracking timeline with events
- ✅ Original ETA vs Revised ETA
- ✅ Email engagement badges (Sent/Opened/Clicked)

## Troubleshooting

**Error: relation "shops" does not exist**
- Run database migrations first: `npm run db:migrate`

**Error: permission denied for table**
- Ensure your DATABASE_URL has correct credentials
- Check PostgreSQL is running: `brew services list`

**No data shows in UI**
- Check dev server is running on port 3000
- Verify database connection in `.env` file
- Check browser console for errors
