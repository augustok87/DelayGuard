# DelayGuard App Store Assets

This directory contains all assets required for Shopify App Store submission.

> **Listing-copy rules (applies to every asset and caption here):** no testimonials in images or text (reqs 4.3.6/4.3.7), no statistics of any kind — verifiable or unverifiable (req 4.3.3), no "first/best/only" superlatives, no stats in the app-card subtitle (req 4.4.1). Pricing everywhere follows LAUNCH_PLAN decision D1: **Free + $7/mo Pro + $25/mo Enterprise** — dollar amounts appear only in the Pricing section below.

## Directory Structure

```
app-store-assets/
├── icons/                        # App icons (various sizes)
├── screenshots/                  # App screenshots
├── feature-image-1600x900.svg    # Feature media source (see Feature Media)
├── generate-screenshots.html     # Screenshot generator
├── generate-screenshots.js       # Screenshot automation
└── README.md                     # This file
```

## App Icons ⚠️ ACTION REQUIRED

### Current Status:
- ✅ `app-icon-1024x1024.png` - Good design
- ✅ `app-icon-512x512.png` - Medium size
- ✅ `app-icon-256x256.png` - Small size
- ✅ `app-icon-128x128.png` - Thumbnail

### ⚠️ REQUIRED UPDATE:
**Shopify now requires**: **1200x1200 pixels** for the main app icon

**Action needed**: Resize the 1024x1024 icon to 1200x1200 pixels

```bash
# Using ImageMagick (install with: brew install imagemagick)
convert app-icon-1024x1024.png -resize 1200x1200 app-icon-1200x1200.png
```

## Screenshots 📸 ⚠️ RE-CAPTURE REQUIRED

### Current Status: NOT submission-ready

Five screenshots exist from an earlier build, but they display **fabricated performance metrics** (satisfaction scores, resolution times, ticket-reduction figures) rendered from mock data. Req 4.3.6 bans statistics and testimonials inside listing images, so these must be **re-captured after the dashboard renders real data** (LAUNCH_PLAN WS-G) with no invented metric tiles visible.

### Files in screenshots/ Directory (pending re-capture)

```
Active Alerts.png
Dashboard Overview.png
Delivered Order.png
Orders.png
Performance Metrics.png
```

### Screenshot Requirements

- **Resolution**: 1600x1200 pixels
- **Format**: PNG or JPEG, less than 5MB per image
- **Content**: actual app interface (not mockups), no fabricated data, no stats, no testimonials
- **Quality**: sharp and readable at all sizes, uncluttered layout, consistent branding

### What each screenshot should show

- **Dashboard Overview**: settings configuration, connection status, delay thresholds, and notification preferences
- **Active Alerts**: delay alerts with priority indicators, customer details, tracking info, and action buttons (Mark Resolved, Dismiss)
- **Orders**: order lifecycle with color-coded status (processing / shipped / delivered)
- **Delivered Order**: successful delivery view with tracking and customer info
- **Alert History**: resolved alerts and carrier trends (avoid any invented metric values)

## Feature Media ⭐ REQUIRED

### Current Status: ✅ Feature image authored

`feature-image-1600x900.svg` in this directory is the feature-image source: a dashboard-composite design in the app's navy + gold visual language (see UI_UX_REDESIGN_ANCHOUR_INSPIRED.md) with the app name and a benefits-focused tagline — no fabricated data, stats, or testimonials.

**Requirements (Option A: Feature Image):**
- **Dimensions**: 1600x900 pixels exactly
- **Format**: PNG or JPEG for upload (render the SVG to PNG)
- **Content**: eye-catching image showing the app's core benefit; brief value proposition; no stats

**Render the PNG:**

```bash
# Any one of these works:
rsvg-convert -w 1600 -h 900 feature-image-1600x900.svg -o feature-image-1600x900.png
npx --yes sharp-cli -i feature-image-1600x900.svg -o feature-image-1600x900.png resize 1600 900
qlmanage -t -s 1600 -o . feature-image-1600x900.svg   # macOS quick-look fallback
```

**Option B: Promotional Video** (alternative, more effort)
- 2-3 minutes, MP4/MOV/AVI, 1920x1080, under 100MB
- Show value and benefits, not just features — no stats or testimonials

## App Listing Copy

> The canonical listing copy lives in `SHOPIFY_APP_STORE_LISTING.md` (repo root). The short-form fields below must stay in sync with it.

### App Name
**DelayGuard** - Proactive Shipping Delay Alerts

### Tagline (max 60 characters)
Prevent customer complaints with automated delay notifications

### Short Description (max 140 characters)
Automatically detect shipping delays and notify customers before they complain. Keep every order's status ahead of the question.

### Full Description (max 5000 characters)

```markdown
# Stop Losing Customers to Shipping Delays

DelayGuard automatically monitors your shipments across major carriers, detects delays before your customers notice, and sends professional notifications to keep them informed.

## Why DelayGuard?

**Fewer "Where is my order?" conversations**
DelayGuard proactively notifies customers about delays, so they hear it from you first instead of writing to your support inbox.

**Multi-Carrier Tracking**
Supports major carriers including USPS, UPS, FedEx, and DHL through the ShipEngine API integration.

**Smart Delay Detection**
Detects delays based on:
- Carrier tracking status
- Expected delivery dates
- Shipping exceptions

## Key Features

✅ **Automated Delay Detection**
- Real-time monitoring of all orders
- Configurable delay thresholds
- Intelligent alert prioritization

✅ **Multi-Channel Notifications**
- Professional email templates
- SMS alerts (Pro and Enterprise plans)
- Customizable branding and messaging

✅ **Analytics Dashboard**
- Track delay trends by carrier
- Monitor notification performance
- Follow every order from processing to delivery

✅ **Easy Setup**
- One-click installation
- Automatic carrier integration
- No coding required

## Pricing

**Free Plan** - Perfect for getting started
- 50 delay alerts per month
- Email notifications
- Basic analytics
- Email support

**Pro Plan** - $7/month
- Unlimited delay alerts
- Email + SMS notifications
- Advanced analytics
- Custom templates
- 14-day free trial

**Enterprise Plan** - $25/month
- Everything in Pro
- White-label notifications
- API access
- Dedicated support
- 14-day free trial

## Technical Details

- **Security**: encrypted data, GDPR-aligned practices
- **Integration**: works with all Shopify plans
- **Support**: email support on every plan

## Get Started in Minutes

1. Install DelayGuard from the App Store
2. Connect your shipping carriers
3. Customize your notification templates
4. Start protecting your customer relationships

Questions? Contact us at augustok87@gmail.com
```

### App Category
**Shipping & Fulfillment**

### Keywords (SEO)
```
shipping delay
order tracking
customer notifications
shipping alerts
delay detection
order status
carrier tracking
fulfillment alerts
proactive notifications
shipping automation
```

## Shopify App Store Submission Checklist

### Required Assets

- [x] App icon (1024x1024) ✓ Ready (resize to 1200x1200 before upload)
- [ ] 5-10 screenshots ⏳ Re-capture on real data, no fabricated metrics
- [x] Feature image (1600x900) ✓ SVG authored — render PNG before upload
- [x] App name and tagline ✓ See SHOPIFY_APP_STORE_LISTING.md
- [x] Short description ✓ See above
- [x] Full description ✓ See above
- [x] Category selection ✓ Shipping & Fulfillment + Customer Service
- [x] Keywords/tags ✓ 10 SEO-optimized keywords ready
- [x] Support email ✓ support@delayguard.app
- [ ] Privacy policy URL ⏳ Served at /legal/privacy-policy once backend deploys
- [ ] Terms of service URL ⏳ Served at /legal/terms-of-service once backend deploys

### Optional but Recommended

- [ ] Demo video / screencast (human task H8 in LAUNCH_PLAN)
- [x] Feature highlights list ✓ In app store listing
- [x] Pricing tiers ✓ Free / Pro / Enterprise per decision D1

## Support

For questions about app store assets:
- Email: augustok87@gmail.com
- Documentation: See /legal/ directory for policies
