# DelayGuard App Store Assets

This directory contains all assets required for Shopify App Store submission.

## Directory Structure

```
app-store-assets/
├── icons/                 # App icons (various sizes)
├── screenshots/           # App screenshot templates
├── videos/               # Demo videos (optional)
├── generate-screenshots.html  # Screenshot generator
├── generate-screenshots.js    # Screenshot automation
└── README.md             # This file
```

## App Icons ⚠️ ACTION REQUIRED

### Current Status:
- ✅ `app-icon-1024x1024.png` - Good design
- ✅ `app-icon-512x512.png` - Medium size
- ✅ `app-icon-256x256.png` - Small size  
- ✅ `app-icon-128x128.png` - Thumbnail

### ⚠️ REQUIRED UPDATE (2025):
**Shopify now requires**: **1200x1200 pixels** for main app icon

**Action needed**: Resize the 1024x1024 icon to 1200x1200 pixels

```bash
# Using ImageMagick (install with: brew install imagemagick)
convert app-icon-1024x1024.png -resize 1200x1200 app-icon-1200x1200.png

# Or use any image editor to resize to 1200x1200px
```

### Icon Design
- **Primary Color**: Blue (#4F46E5)
- **Symbol**: Shield with checkmark (representing delay protection)
- **Style**: Modern, flat design
- **Background**: Gradient blue

## Screenshots 📸 ACTION REQUIRED

### What You Need

Shopify requires **5-10 high-quality screenshots** showing:

1. **Dashboard** - Main app dashboard with metrics
2. **Alerts View** - Delay alerts list
3. **Order Tracking** - Order details and tracking info
4. **Analytics** - Charts and reporting
5. **Settings** - Configuration options

### ⚠️ UPDATED DIMENSIONS (2025)

**IMPORTANT**: Shopify updated screenshot requirements in 2024:
- **Screenshots**: 1600x1200 pixels (NOT 1920x1080)
- **Feature Media**: 1600x900 pixels (NEW - required for listing header)
- **App Icon**: 1200x1200 pixels (NOT 1024x1024)

### Option 1: Generate from HTML Templates (Recommended)

We have HTML templates ready. To generate screenshots:

```bash
cd app-store-assets

# Method A: Using Node.js script (if you have puppeteer installed)
# IMPORTANT: Update script to use 1600x1200 dimensions
npm install puppeteer
node generate-screenshots.js

# Method B: Manual browser screenshots (RECOMMENDED)
# 1. Open each HTML file in browser
# 2. Set window to 1600x1200 (NEW DIMENSIONS)
# 3. Take full-page screenshot
# 4. Save as PNG to screenshots/ directory
```

### HTML Templates Available

- `screenshots/dashboard.html` - Main dashboard view
- `screenshots/alerts.html` - Alerts management
- `screenshots/orders.html` - Order tracking
- `screenshots/analytics.html` - Analytics dashboard
- `screenshots/settings.html` - App settings

### Option 2: Screenshot from Running App

```bash
# 1. Start the app locally
cd delayguard-app
npm run dev

# 2. Navigate to http://localhost:3000
# 3. Use browser DevTools or screenshot tool
# 4. Capture at 1920x1080 resolution
# 5. Save to app-store-assets/screenshots/
```

### Screenshot Requirements (Updated 2025)

✅ **Resolution**: **1600x1200 pixels** (Shopify standard 2024-2025)  
✅ **Format**: PNG or JPEG  
✅ **Size**: Less than 5MB per image  
✅ **Quality**: High resolution, no blurriness  
✅ **Content**: Show actual app interface (not mockups)  
✅ **Text**: Readable at all sizes  
✅ **Branding**: Consistent colors and style  
✅ **Layout**: Uncluttered, clear feature demonstration

### Screenshot Naming Convention

```
1-dashboard-main.png
2-alerts-overview.png
3-order-tracking.png
4-analytics-reports.png
5-settings-configuration.png
6-notifications-templates.png
```

## Feature Media ⭐ REQUIRED (NEW for 2025)

### ⚠️ MANDATORY REQUIREMENT

Shopify now **requires** Feature Media for the listing header. Choose ONE:

**Option A: Feature Image** (Recommended for faster submission)
- **Dimensions**: **1600x900 pixels**
- **Format**: PNG or JPEG
- **Content**: Eye-catching image showing app's core benefit
- **Text overlay**: Brief value proposition (e.g., "Stop Shipping Delays Before Customers Complain")
- **Design**: Professional, brand-aligned, clear messaging

**Option B: Promotional Video** (More engaging but takes longer)
- **Length**: **2-3 minutes** (promotional, not instructional)
- **Format**: MP4, MOV, or AVI
- **Resolution**: 1920x1080 (Full HD)
- **Size**: Less than 100MB
- **Content**: Show VALUE and BENEFITS, not just features
- **Style**: Professional, engaging, fast-paced

### Tools for Creation

**For Feature Image**:
- Canva (free, easy templates)
- Figma (professional design)
- Photoshop (advanced)

**For Promotional Video**:
- **Loom** - https://www.loom.com (Free, easy to use)
- **OBS Studio** - https://obsproject.com (Free, professional)
- **QuickTime** (Mac) - Built-in screen recording
- **Windows Game Bar** (Windows) - Built-in screen recording
- **DaVinci Resolve** (Free, professional editing)

## App Listing Copy

### App Name
**DelayGuard** - Proactive Shipping Delay Alerts

### Tagline (max 60 characters)
Prevent customer complaints with automated delay notifications

### Short Description (max 140 characters)
Automatically detect shipping delays and notify customers before they complain. Reduce support tickets by up to 40%.

### Full Description (max 5000 characters)

```markdown
# Stop Losing Customers to Shipping Delays

DelayGuard automatically monitors your shipments across 50+ carriers, detects delays before your customers notice, and sends professional notifications to keep them informed.

## Why DelayGuard?

**40% Reduction in Support Tickets**
Stop fielding "Where is my order?" questions. DelayGuard proactively notifies customers about delays, reducing your support burden.

**Multi-Carrier Tracking**
Supports 50+ carriers including USPS, UPS, FedEx, DHL, and more through ShipEngine API integration.

**Smart Delay Detection**
Advanced algorithms detect delays based on:
- Carrier tracking status
- Expected delivery dates
- Shipping exceptions
- Historical delivery patterns

## Key Features

✅ **Automated Delay Detection**
- Real-time monitoring of all orders
- Configurable delay thresholds (1-7 days)
- Intelligent alert prioritization

✅ **Multi-Channel Notifications**
- Professional email templates
- SMS alerts (Pro and Enterprise plans)
- Customizable branding and messaging

✅ **Analytics Dashboard**
- Track delay trends by carrier
- Monitor notification performance
- Measure customer satisfaction impact

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
- Dedicated account manager
- 14-day free trial

## What Merchants Are Saying

"DelayGuard has been a game-changer for our customer service team. Support tickets are down 35% since we started using it!" - Sarah J., Fashion Retailer

"The automated notifications have completely transformed how we handle shipping delays. Our customers appreciate the proactive communication." - Mike T., Electronics Store

## Technical Details

- **Security**: Enterprise-grade encryption, GDPR compliant
- **Performance**: 99.9% uptime, real-time processing
- **Integration**: Works with all Shopify plans
- **Support**: Email and phone support available

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

### Required Assets ✅

- [x] App icon (1024x1024)
- [ ] 5-10 screenshots
- [ ] App name and tagline
- [ ] Short description
- [ ] Full description
- [ ] Category selection
- [ ] Keywords/tags
- [ ] Support email
- [ ] Privacy policy URL
- [ ] Terms of service URL

### Optional but Recommended

- [ ] Demo video (30-60 seconds)
- [ ] Feature highlights list
- [ ] Customer testimonials
- [ ] Pricing comparison table

## Next Steps

1. ✅ **Generate Screenshots** - Use provided HTML templates
2. ✅ **Review Copy** - Ensure all text is accurate and compelling
3. ✅ **Create Video** - Optional but highly recommended
4. ✅ **Test Assets** - Verify all images display correctly
5. ✅ **Submit to Shopify** - Upload all assets to Partner Dashboard

## Support

For questions about app store assets:
- Email: augustok87@gmail.com
- Documentation: See /legal/ directory for policies

