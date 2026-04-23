# DelayGuard UI/UX Redesign
## Inspired by Anchour Portfolio (Lighthouse, Payground)

**Document Version**: 1.1
**Date**: December 11, 2025
**Scope**: Complete visual identity and UX redesign for DelayGuard Shopify App
**Status**: Active - Implementation in Progress

---

## Table of Contents

1. [Design Philosophy Analysis](#1-design-philosophy-analysis)
2. [Brand Positioning & Messaging](#2-brand-positioning--messaging)
3. [Color System & Visual Identity](#3-color-system--visual-identity)
4. [Typography System](#4-typography-system)
5. [Component Redesign Specifications](#5-component-redesign-specifications)
6. [Hero Imagery & AI Generation Prompts](#6-hero-imagery--ai-generation-prompts)
7. [Accessibility & Inclusive Design](#7-accessibility--inclusive-design)
8. [Motion & Animation Principles](#8-motion--animation-principles)
9. [UX Writing & Microcopy Guidelines](#9-ux-writing--microcopy-guidelines)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Services We Can Confidently Offer](#11-services-we-can-confidently-offer)

---

## 1. Design Philosophy Analysis

### Lessons from Anchour Portfolio

**Lighthouse Credit Union** - Key Takeaways:
- **Guiding metaphor**: Logo as navigation tool (lighthouse = guide through financial complexity)
- **Color psychology**: Vibrant yellow/gold paired with deep purple (optimism meets trust)
- **Illustrative approach**: Diverse real-life moments, humanizing financial services
- **Outdoor/natural elements**: Stability, openness, journey-focused imagery
- **Results-driven**: 40% brand awareness increase, 123% faster membership growth

**Payground Healthcare Payments** - Key Takeaways:
- **Simplification first**: "Scalable building blocks" reducing friction
- **Elegant, simple, clear**: No unnecessary complexity
- **Accessibility testing**: Inclusive design is non-negotiable
- **Information architecture**: Reducing cognitive load across user segments
- **Human-centered**: Compassionate, convenient messaging

### DelayGuard Design Philosophy (NEW)

**Core Principle**: DelayGuard should feel like a **trusted radar system** for shipping visibility - calm yet vigilant, professional yet approachable.

**Visual Metaphor**: **"Your Shipping Guardian"**
- Radar/shield imagery (protection, vigilance)
- Clear skies after storms (resolution, peace of mind)
- Lighthouse beam cutting through fog (guidance, clarity)

**Emotional Goals**:
1. **Trust**: Merchants should feel confident their delays won't slip through
2. **Calm Control**: Not alarming - empowering and proactive
3. **Professional**: Appropriate for B2B SaaS targeting serious store owners
4. **Human**: Real impact on real customers and real businesses

---

## 2. Brand Positioning & Messaging

### Tagline Options

**Primary (Recommended)**:
> **"Shipping delays are inevitable. Losing customers isn't."**

**Alternatives**:
> "Proactive shipping intelligence for Shopify merchants"
> "Turn delivery delays into customer loyalty opportunities"
> "The early warning system your shipping stack needs"

### Voice & Tone

| Aspect | Current | Anchour-Inspired |
|--------|---------|------------------|
| Headlines | Technical/Feature-focused | Outcome/Benefit-focused |
| Body Text | Explanatory | Conversational, confident |
| CTAs | Generic ("Submit", "Save") | Action-oriented ("Protect This Order", "Start Monitoring") |
| Error States | Clinical | Empathetic, solution-focused |

### Positioning Statement

**For** Shopify merchants who process 50+ orders monthly,
**Who** struggle with shipping delays damaging customer relationships,
**DelayGuard is** a proactive delay detection and customer communication platform
**That** automatically identifies at-risk shipments and enables timely outreach.
**Unlike** manual tracking spreadsheets or reactive customer service,
**DelayGuard** catches delays before customers complain, turning potential problems into loyalty-building moments.

---

## 3. Color System & Visual Identity

### Primary Palette

Drawing from Lighthouse's optimistic warmth and Payground's professional clarity:

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary Navy** | Deep Trust Blue | `#1e3a5f` | Headers, primary buttons, nav background |
| **Accent Gold** | Vigilant Amber | `#f59e0b` | Highlights, alerts, CTAs, badges |
| **Success Teal** | Resolution Green | `#059669` | Delivered, resolved states, positive indicators |
| **Alert Coral** | Attention Red | `#dc2626` | Critical delays, urgent badges |
| **Background Light** | Canvas White | `#f8fafc` | Page backgrounds |
| **Background Dark** | Hero Navy | `#0f172a` | Hero sections, feature blocks |

### Secondary & Semantic Colors

| Role | Hex | Usage |
|------|-----|-------|
| **Warning Amber** | `#d97706` | Medium priority, in-transit delays |
| **Info Blue** | `#3b82f6` | Links, informational badges |
| **Muted Gray** | `#64748b` | Secondary text, borders |
| **Surface** | `#ffffff` | Cards, modal backgrounds |
| **Border** | `#e2e8f0` | Subtle separators |

### Gradient Usage (Minimal - Anchour Principle)

**Hero Gradient** (Dark sections only):
```css
background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
```

**Cards**: Solid white backgrounds (no gradients - cleaner, more professional)

### Dark Mode Foundation

The hero and key feature sections should use **dark backgrounds** (like Anchour's portfolio), creating:
- High contrast for readability
- Premium, modern feel
- Visual separation between marketing and functional UI

---

## 4. Typography System

### Font Stack (Performance-First, Like Anchour)

```css
/* Primary - System fonts for speed */
--font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

/* Display - For headlines (optional - premium feel) */
--font-display: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Type Scale

| Element | Size | Weight | Line Height | Tracking |
|---------|------|--------|-------------|----------|
| **Hero H1** | 56px | 700 | 1.1 | -0.02em |
| **Section H2** | 40px | 600 | 1.2 | -0.01em |
| **Card H3** | 24px | 600 | 1.3 | 0 |
| **H4/Labels** | 18px | 600 | 1.4 | 0 |
| **Body** | 16px | 400 | 1.6 | 0 |
| **Small/Caption** | 14px | 400 | 1.5 | 0.01em |
| **Badge/Micro** | 12px | 500 | 1.4 | 0.02em |

### Headline Style Guide

**DO** (Anchour-style):
- "Turn delays into loyalty moments"
- "50+ carriers. One dashboard."
- "Real-time visibility, proactive action"

**DON'T**:
- "Shipping Delay Alert Management System"
- "Configure Your Notification Settings"
- "Order Tracking and Monitoring Platform"

---

## 5. Component Redesign Specifications

### 5.1 App Header (Complete Redesign)

**Current**: Standard white header with metrics
**New**: Dark navy hero-style header with glassmorphism elements

```
Design Spec:
- Background: Deep navy (#1e3a5f) with subtle gradient to darker
- Store name: White, 20px, semi-bold
- Connection badge: Glass-morphism pill (rgba(255,255,255,0.1) bg)
- Metrics: Large numerals (32px) with small labels below
- Active alerts: Amber accent color (#f59e0b)
```

**Layout**:
```
+------------------------------------------------------------------+
| STORE NAME                          Connected [checkmark badge]   |
|                                                                   |
|    [42]           [8]            [31]           [2.3 days]        |
|  Total Alerts   Active       Resolved        Avg Resolution       |
+------------------------------------------------------------------+
```

### 5.2 Tab Navigation (Refined)

**Current**: Standard tabs with icons
**New**: Pill-style navigation with smooth transitions

```css
.tabNav {
  background: #f1f5f9;
  border-radius: 12px;
  padding: 4px;
  display: inline-flex;
  gap: 4px;
}

.tab {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.tabActive {
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  color: #1e3a5f;
}
```

### 5.3 Alert Cards (Premium Redesign)

**Current**: Standard cards with colored borders
**New**: Elevated cards with priority-based visual hierarchy

**Critical Priority Card**:
```
Design Spec:
- Left border: 4px solid #dc2626 (red)
- Top accent: Subtle red glow (box-shadow: inset 0 3px 0 0 #dc262620)
- Badge: Red background, white text "CRITICAL"
- Hover: Elevate with increased shadow
```

**Visual Hierarchy**:
```
+------------------------------------------------------------------+
| [CRITICAL]  Order #1234                    $459.00               |
|                                                                   |
|  John Smith                   5 days delayed                      |
|  john@email.com               Original ETA: Dec 5                 |
|                               Current ETA: Dec 10                 |
|------------------------------------------------------------------|
| [Product Image] Wireless Headphones - Black (x1)     $149.00     |
| [Product Image] USB-C Cable (x2)                      $29.98     |
|------------------------------------------------------------------|
| [Tracking Timeline - Collapsible]                                 |
| [Dec 5, 8:00am] Picked up - Los Angeles, CA                      |
| [Dec 6, 2:15pm] In Transit - Phoenix, AZ                         |
| [Dec 7, 5:30pm] EXCEPTION: Weather Delay - Denver, CO  [!]       |
|------------------------------------------------------------------|
| [email icon] Notification sent Dec 7   [opened] [clicked]        |
|------------------------------------------------------------------|
|                    [Reopen]  [Mark Resolved]  [Dismiss]          |
+------------------------------------------------------------------+
```

### 5.4 Settings Page (Simplified Elegance)

**Current**: Accordion-based with detailed explanations
**New**: Clean card grid with contextual help

**Design Principles**:
- Each delay type = One clean card
- Toggle + threshold in one view (no expansion needed)
- Help via modal (already implemented in v1.25)
- Visual icons (Lucide - already implemented)

**Layout**:
```
+------------------------+  +------------------------+  +------------------------+
| [Package icon]         |  | [AlertTriangle icon]   |  | [Clock icon]           |
| WAREHOUSE DELAYS       |  | CARRIER DELAYS         |  | TRANSIT DELAYS         |
|                        |  |                        |  |                        |
| [Toggle: ON]           |  | [Toggle: ON]           |  | [Toggle: ON]           |
|                        |  |                        |  |                        |
| Alert after [2] days   |  | Monitors carrier       |  | Alert after [5] days   |
| unfulfilled            |  | exceptions             |  | in transit             |
|                        |  |                        |  |                        |
| [Learn More]           |  | [Learn More]           |  | [Learn More]           |
+------------------------+  +------------------------+  +------------------------+
```

### 5.5 Empty States (Illustrated)

**Current**: Text with emoji icons
**New**: Custom illustrations + encouraging copy

**No Active Alerts**:
```
[Illustration: Clear skies, birds flying, sun shining]
"All clear! Your shipments are on track."
"We'll alert you the moment something needs attention."
```

**No Orders Yet**:
```
[Illustration: Package with wings, ready to fly]
"Ready when you are!"
"Orders will appear here once they start flowing."
```

---

## 6. Hero Imagery & AI Generation Prompts

### 6.1 Primary Hero Image - Dashboard/Control Room Theme

**Concept**: A serene, modern control room with soft ambient lighting, featuring screens showing shipping routes and status indicators. A sense of calm vigilance.

**AI Image Prompt** (for Midjourney/DALL-E/Flux):
```
A modern minimalist control room with soft ambient lighting, large curved monitors displaying abstract shipping route maps and gentle status indicators, deep navy blue walls with subtle golden accent lighting, a single professional person (back view, not focused on face) observing screens, clean desk with minimal items, photorealistic, editorial photography style, 8k, shallow depth of field, warm color grading similar to Lighthouse credit union branding, corporate but human, inspirational atmosphere --ar 16:9 --style raw
```

### 6.2 Secondary Hero - Human Connection Theme

**Concept**: A diverse merchant/small business owner moment - checking phone with satisfied expression, packages in background suggesting successful deliveries.

**AI Image Prompt**:
```
A candid lifestyle photograph of a diverse small business owner (30s, any ethnicity) checking their phone with a subtle smile of relief, soft natural window lighting, blurred background showing organized shipping boxes and packages, modern minimalist office/warehouse aesthetic, warm amber and navy color tones, editorial portrait photography style, authentic moment, not staged looking, Lighthouse credit union illustration style influence but photorealistic, 8k quality --ar 4:5 --style raw
```

### 6.3 Feature Section - Carrier Network

**Concept**: Abstract visualization of a connected shipping network - elegant, technical but approachable.

**AI Image Prompt**:
```
Abstract 3D visualization of a shipping network with glowing connection lines between nodes representing cities, deep navy blue background with amber/gold accent glows, clean minimalist style, subtle grid pattern, gentle particle effects, data visualization aesthetic, corporate but beautiful, Payground healthcare brand style influence, soft gradients, 8k resolution, editorial quality --ar 16:9 --style raw
```

### 6.4 Testimonial/Social Proof Section

**Concept**: A happy merchant team celebrating a successful month - human, warm, authentic.

**AI Image Prompt**:
```
A candid photograph of a diverse small e-commerce team (3-4 people) in a modern warehouse/office hybrid space, natural lighting, genuine smiles and collaborative energy, shipping boxes and equipment visible but not dominant, warm amber lighting mixed with natural daylight, editorial lifestyle photography, authentic moment not corporate stock photo, Lighthouse credit union branding color influence (warm gold and purple-blue undertones), 8k quality --ar 3:2 --style raw
```

### 6.5 Empty State Illustrations

**No Alerts - Clear Skies**:
```
Minimalist 2D illustration of a single small package with tiny wings, floating against a soft gradient sky (navy to light blue), single sun ray beam from top corner, Lighthouse credit union illustration style, warm and optimistic, vector art quality, clean lines, limited color palette (navy, gold, white, soft blue) --ar 1:1
```

**Resolved - Mission Complete**:
```
Minimalist 2D illustration of a package with a checkmark, gentle confetti or sparkles around it, soft gradient background (teal to white), celebratory but professional, Lighthouse credit union illustration style, vector art, clean and modern --ar 1:1
```

### 6.6 Onboarding/Setup Flow

**Step 1 - Connect Shopify**:
```
Clean isometric 3D illustration of a Shopify logo connecting to a shield/radar icon via a glowing line, soft shadows, navy and gold color scheme, minimalist, professional, similar to Payground visual system, gradient background --ar 16:9
```

**Step 2 - Configure Rules**:
```
Clean isometric 3D illustration of three slider controls with golden knobs, emanating gentle glow rings, minimalist dashboard aesthetic, navy background with subtle grid, professional and approachable --ar 16:9
```

---

## 7. Accessibility & Inclusive Design

### WCAG 2.1 AA Compliance (Minimum)

| Requirement | Standard | DelayGuard Implementation |
|-------------|----------|---------------------------|
| **Color Contrast** | 4.5:1 text, 3:1 UI | All text on dark navy: white (#fff) = 12.6:1 |
| **Focus States** | Visible focus indicators | 2px amber (#f59e0b) outline on all interactive elements |
| **Keyboard Navigation** | All functions accessible | Tab order, Enter/Space activation, Escape to close |
| **Screen Readers** | Semantic HTML, ARIA | role, aria-label, aria-describedby on all components |
| **Reduced Motion** | Respect prefers-reduced-motion | All animations honor @media (prefers-reduced-motion) |

### Color Blind Safe Palette

Our palette has been tested against deuteranopia, protanopia, and tritanopia:

| Color Role | Hex | Accessibility Note |
|------------|-----|-------------------|
| **Alert Red** | #dc2626 | Paired with CRITICAL text label (not color alone) |
| **Amber Gold** | #f59e0b | Paired with icon + text context |
| **Success Teal** | #059669 | Paired with checkmark icon + RESOLVED label |
| **Navy Background** | #1e3a5f | High contrast with white text |

### Inclusive Design Principles

1. **Don't rely on color alone** - Always pair colors with icons/text labels
2. **Readable font sizes** - Minimum 14px body text, scalable via rem units
3. **Touch targets** - Minimum 44x44px for mobile interactive elements
4. **Clear error messages** - Specific, actionable, not color-dependent
5. **Loading states** - Always indicate progress, respect cognitive load

---

## 8. Motion & Animation Principles

### Core Philosophy: Purposeful Motion

Following Anchour's restrained elegance, animations should:
- **Inform** - Communicate state changes and relationships
- **Focus** - Guide attention to important elements
- **Delight** - Add subtle polish without distraction

### Animation Hierarchy

| Priority | Use Case | Duration | Easing |
|----------|----------|----------|--------|
| **P1: Critical** | State changes (loading, success, error) | 200ms | ease-out |
| **P2: Navigation** | Page/tab transitions | 300ms | ease-in-out |
| **P3: Interaction** | Button hover, focus states | 150ms | ease |
| **P4: Ambient** | Subtle breathing effects (sparingly) | 2000ms+ | ease-in-out |

### Specific Animations

```css
/* Anchour-inspired micro-interactions */

/* Card hover - subtle elevation */
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.15);
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}

/* Button press - tactile feedback */
.button:active {
  transform: scale(0.98);
  transition: transform 100ms ease;
}

/* Tab transition - smooth slide */
.tabContent {
  animation: slideIn 300ms ease-in-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Alert appear - attention without alarm */
.alertCard {
  animation: alertAppear 400ms ease-out;
}

@keyframes alertAppear {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 9. UX Writing & Microcopy Guidelines

### Voice Principles (Anchour-Inspired)

| Principle | Description | Example |
|-----------|-------------|---------|
| **Confident** | Assured, not tentative | "We found 3 delays" not "We may have found..." |
| **Human** | Warm, not robotic | "All clear!" not "No alerts detected." |
| **Action-oriented** | Guide next steps | "Mark as resolved" not "Change status" |
| **Concise** | Respect time | "5 days late" not "The package is 5 days behind schedule" |

### Component-Specific Microcopy

**Headers & Labels**:
```
DO: "Active Alerts"
DON'T: "Currently Active Shipping Delay Alert Items"

DO: "Avg Resolution"
DON'T: "Average Time to Resolution in Days"
```

**Empty States**:
```
DO: "All clear! Your shipments are on track."
DON'T: "There are currently no active delay alerts to display."

DO: "Ready when you are!"
DON'T: "No orders have been received yet."
```

**Error Messages**:
```
DO: "Couldn't load alerts. Try refreshing."
DON'T: "Error: Failed to fetch data from API endpoint."

DO: "Lost connection. Reconnecting..."
DON'T: "Network Error: Connection to server failed."
```

**Success Messages**:
```
DO: "Alert resolved!"
DON'T: "The alert has been successfully marked as resolved."

DO: "Settings saved"
DON'T: "Your configuration changes have been saved successfully."
```

**Button Labels**:
```
DO: "Mark Resolved" / "Dismiss" / "Reopen"
DON'T: "Submit" / "Cancel" / "Update Status"

DO: "Save Changes"
DON'T: "Apply Configuration"
```

### Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| **Onboarding** | Welcoming, encouraging | "Let's get you set up!" |
| **Normal operation** | Professional, calm | "3 active alerts" |
| **Warnings** | Clear, not alarming | "This order is 5 days late" |
| **Errors** | Helpful, solution-focused | "Try refreshing the page" |
| **Success** | Celebratory but brief | "Done!" / "Saved!" |

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. **Color System Implementation**
   - Update CSS variables in global styles
   - Create new color tokens file
   - Update existing component styles

2. **Typography Refinement**
   - Implement new type scale
   - Update headline styles across app
   - Ensure responsive scaling

3. **Header Redesign**
   - Dark hero-style header
   - Glassmorphism connection badge
   - Updated metrics display

### Phase 2: Component Updates (Week 2-3)
1. **Alert Cards Premium**
   - Elevated card design
   - Priority-based visual hierarchy
   - Improved product display

2. **Tab Navigation**
   - Pill-style navigation
   - Smooth transitions
   - Active state refinement

3. **Settings Cards**
   - Simplified card grid
   - Improved toggle UX
   - Modal help system (done)

### Phase 3: Polish & Imagery (Week 3-4)
1. **Generate AI Images**
   - Hero images (2-3 options)
   - Empty state illustrations
   - Feature section graphics

2. **Empty States**
   - Implement custom illustrations
   - Write encouraging copy
   - Add subtle animations

3. **Final Polish**
   - Micro-interactions
   - Loading states
   - Accessibility audit

---

## 11. Services We Can Confidently Offer

Based on [DATA_AVAILABILITY_ANALYSIS.md](DATA_AVAILABILITY_ANALYSIS.md), here are the **VERIFIED REAL** services to highlight in marketing:

### Tier 1: Core Value Propositions (100% Real Data)

| Service | Data Source | Confidence |
|---------|-------------|------------|
| **3-Rule Delay Detection** | PostgreSQL + ShipEngine | **100%** |
| - Warehouse Delays | Order fulfillment status | Verified |
| - Carrier Delays | ShipEngine exception events | Verified |
| - Transit Delays | ShipEngine tracking timeline | Verified |
| **Real-Time Tracking** | ShipEngine API (50+ carriers) | **100%** |
| **Order Dashboard** | Shopify GraphQL API | **100%** |
| **Customer Information** | Shopify Customer API | **100%** |
| **Product Line Items** | Shopify GraphQL (Phase 1.2) | **100%** |
| **Email Engagement** | SendGrid Webhooks (Phase 1.3) | **100%** |
| **Alert Management** | PostgreSQL (active/resolved/dismissed) | **100%** |

### Tier 2: Dashboard Metrics (Verified Real - v1.16)

| Metric | Source | Status |
|--------|--------|--------|
| Total Alerts | SQL COUNT(*) | **Real** |
| Active Alerts | SQL JOIN + filter | **Real** |
| Resolved Alerts | SQL JOIN + filter | **Real** |
| Avg Resolution Time | SQL AVG calculation | **Real** |

### Tier 3: DO NOT Highlight (Uncertain/Missing Backend)

| Feature | Issue | Recommendation |
|---------|-------|----------------|
| Merchant Benchmarks | UI exists, no backend | Hide from marketing |
| Suggested Actions | DB field exists, no logic | Hide from marketing |
| AI-Powered Suggestions | Not implemented | Future roadmap |

### Marketing Copy Based on Real Data

**Hero Statement**:
> "Monitor 50+ carriers. Catch delays before customers complain.
> Real-time tracking intelligence for Shopify merchants."

**Feature Bullets** (All Verified):
- 3 intelligent delay detection rules
- Real-time tracking from 50+ carriers via ShipEngine
- Automated email notifications with open/click tracking
- Complete order visibility with product details
- Priority-based alert management (Critical/High/Medium/Low)

**Social Proof Numbers** (Template - Fill with Real Data):
- "Monitoring X+ orders across Y merchants"
- "Average alert response time: Z hours"
- "X carriers supported worldwide"

---

## Summary

This redesign draws directly from Anchour's work with Lighthouse and Payground:

1. **Visual Identity**: Dark hero sections, amber accents, professional navy palette
2. **Typography**: Clean, confident headlines focused on outcomes
3. **UX Philosophy**: Reduce cognitive load, calm vigilance over alarming alerts
4. **Imagery**: Lifestyle-focused, human moments, illustrative empty states
5. **Messaging**: Benefit-driven, not feature-driven
6. **Data Integrity**: Only highlight services with 100% verified real data

The result should feel like a **trusted guardian** for merchants - sophisticated enough for serious businesses, human enough to build genuine loyalty.

---

**Next Steps**:
1. Review and approve design direction
2. Generate hero images using AI prompts
3. Begin Phase 1 implementation (colors, typography, header)
4. Iterate based on feedback

---

*Document created: December 11, 2025*
*Based on analysis of: Anchour portfolio (anchour.com/work), Lighthouse, Payground*
*Data verification: DATA_AVAILABILITY_ANALYSIS.md (84% real data confirmed)*
