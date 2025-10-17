#!/usr/bin/env node

/**
 * DelayGuard Screenshot Generator
 * 
 * This script generates professional screenshots for the Shopify App Store submission.
 * It creates 5 high-quality screenshots showcasing different aspects of the DelayGuard app.
 */

const fs = require('fs');
const path = require('path');

// Screenshot configurations
const screenshots = [
    {
        id: 'dashboard',
        title: 'Dashboard Overview',
        description: 'Main dashboard showing delay alerts, statistics, and key metrics',
        filename: 'delayguard-dashboard-overview.png',
        content: `
            <div style="padding: 20px; background: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <h2 style="color: #333; margin-bottom: 20px; font-size: 24px;">DelayGuard Dashboard</h2>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 2rem; color: #1976d2; font-weight: bold;">12</div>
                        <div style="color: #666; font-size: 0.9rem;">Active Alerts</div>
                    </div>
                    <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 2rem; color: #7b1fa2; font-weight: bold;">156</div>
                        <div style="color: #666; font-size: 0.9rem;">Orders Tracked</div>
                    </div>
                    <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 2rem; color: #388e3c; font-weight: bold;">98%</div>
                        <div style="color: #666; font-size: 0.9rem;">Success Rate</div>
                    </div>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <h3 style="color: #333; margin-bottom: 10px;">Recent Alerts</h3>
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">• Order #12345 - Delayed by 2 days</div>
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">• Order #12346 - Weather delay</div>
                    <div style="color: #666; font-size: 0.9rem;">• Order #12347 - Carrier issue</div>
                </div>
            </div>
        `
    },
    {
        id: 'alerts',
        title: 'Delay Alerts Management',
        description: 'Comprehensive alerts management with filtering and bulk actions',
        filename: 'delayguard-alerts-management.png',
        content: `
            <div style="padding: 20px; background: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <h2 style="color: #333; margin-bottom: 20px; font-size: 24px;">Delay Alerts Management</h2>
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button style="background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">All Alerts</button>
                    <button style="background: #f8f9fa; color: #333; border: 1px solid #ddd; padding: 8px 16px; border-radius: 5px; cursor: pointer;">High Priority</button>
                    <button style="background: #f8f9fa; color: #333; border: 1px solid #ddd; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Resolved</button>
                </div>
                <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background: #f8f9fa; padding: 15px; border-bottom: 1px solid #ddd; display: grid; grid-template-columns: 1fr 2fr 1fr 1fr 1fr; gap: 10px; font-weight: 600; color: #333;">
                        <div>Status</div>
                        <div>Order</div>
                        <div>Delay</div>
                        <div>Customer</div>
                        <div>Actions</div>
                    </div>
                    <div style="padding: 15px; border-bottom: 1px solid #eee; display: grid; grid-template-columns: 1fr 2fr 1fr 1fr 1fr; gap: 10px; align-items: center;">
                        <div style="background: #ffebee; color: #c62828; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; text-align: center;">High</div>
                        <div style="color: #333;">#12345 - FedEx</div>
                        <div style="color: #d32f2f;">+2 days</div>
                        <div style="color: #666;">John Doe</div>
                        <div><button style="background: #667eea; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">View</button></div>
                    </div>
                    <div style="padding: 15px; border-bottom: 1px solid #eee; display: grid; grid-template-columns: 1fr 2fr 1fr 1fr 1fr; gap: 10px; align-items: center;">
                        <div style="background: #fff3e0; color: #ef6c00; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; text-align: center;">Medium</div>
                        <div style="color: #333;">#12346 - UPS</div>
                        <div style="color: #f57c00;">+1 day</div>
                        <div style="color: #666;">Jane Smith</div>
                        <div><button style="background: #667eea; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">View</button></div>
                    </div>
                </div>
            </div>
        `
    },
    {
        id: 'orders',
        title: 'Order Tracking',
        description: 'Real-time order tracking with carrier integration and status updates',
        filename: 'delayguard-order-tracking.png',
        content: `
            <div style="padding: 20px; background: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <h2 style="color: #333; margin-bottom: 20px; font-size: 24px;">Order Tracking</h2>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <input type="text" placeholder="Enter tracking number..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                        <button style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Track</button>
                    </div>
                </div>
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
                    <h3 style="color: #333; margin-bottom: 15px;">Order #12345 - FedEx</h3>
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <div style="width: 12px; height: 12px; background: #4caf50; border-radius: 50%; margin-right: 10px;"></div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #333;">Delivered</div>
                            <div style="color: #666; font-size: 0.9rem;">Delivered to customer on Oct 15, 2024</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <div style="width: 12px; height: 12px; background: #4caf50; border-radius: 50%; margin-right: 10px;"></div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #333;">Out for Delivery</div>
                            <div style="color: #666; font-size: 0.9rem;">Package is out for delivery on Oct 15, 2024</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <div style="width: 12px; height: 12px; background: #4caf50; border-radius: 50%; margin-right: 10px;"></div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #333;">In Transit</div>
                            <div style="color: #666; font-size: 0.9rem;">Package is in transit from sorting facility</div>
                        </div>
                    </div>
                </div>
            </div>
        `
    },
    {
        id: 'settings',
        title: 'Settings & Configuration',
        description: 'Customizable notification settings and delay thresholds',
        filename: 'delayguard-settings-configuration.png',
        content: `
            <div style="padding: 20px; background: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <h2 style="color: #333; margin-bottom: 20px; font-size: 24px;">Settings & Configuration</h2>
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #333; margin-bottom: 15px;">Delay Thresholds</h3>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px; color: #333;">High Priority Delay (days)</label>
                            <input type="number" value="2" style="width: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px; color: #333;">Medium Priority Delay (days)</label>
                            <input type="number" value="1" style="width: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #333; margin-bottom: 15px;">Notifications</h3>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
                            <span style="color: #333;">Email Notifications</span>
                            <input type="checkbox" checked style="transform: scale(1.2);">
                        </div>
                        <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
                            <span style="color: #333;">SMS Notifications</span>
                            <input type="checkbox" checked style="transform: scale(1.2);">
                        </div>
                        <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
                            <span style="color: #333;">Push Notifications</span>
                            <input type="checkbox" style="transform: scale(1.2);">
                        </div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <button style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin-right: 10px; cursor: pointer;">Save Settings</button>
                    <button style="background: #f8f9fa; color: #333; border: 1px solid #ddd; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Reset</button>
                </div>
            </div>
        `
    },
    {
        id: 'analytics',
        title: 'Analytics & Reports',
        description: 'Detailed analytics dashboard with performance insights',
        filename: 'delayguard-analytics-reports.png',
        content: `
            <div style="padding: 20px; background: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <h2 style="color: #333; margin-bottom: 20px; font-size: 24px;">Analytics & Reports</h2>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <h3 style="color: #333; margin-bottom: 10px;">Delay Trends</h3>
                        <div style="height: 100px; background: linear-gradient(45deg, #667eea, #764ba2); border-radius: 5px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                            📊 Chart Placeholder
                        </div>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <h3 style="color: #333; margin-bottom: 10px;">Carrier Performance</h3>
                        <div style="margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="color: #333;">FedEx</span>
                                <span style="color: #4caf50;">98%</span>
                            </div>
                            <div style="background: #e0e0e0; height: 8px; border-radius: 4px;">
                                <div style="background: #4caf50; height: 100%; width: 98%; border-radius: 4px;"></div>
                            </div>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="color: #333;">UPS</span>
                                <span style="color: #ff9800;">85%</span>
                            </div>
                            <div style="background: #e0e0e0; height: 8px; border-radius: 4px;">
                                <div style="background: #ff9800; height: 100%; width: 85%; border-radius: 4px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <h3 style="color: #333; margin-bottom: 10px;">Key Metrics</h3>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 600; color: #667eea;">156</div>
                            <div style="color: #666; font-size: 0.9rem;">Total Orders</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 600; color: #4caf50;">12</div>
                            <div style="color: #666; font-size: 0.9rem;">Delays Detected</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 600; color: #ff9800;">92%</div>
                            <div style="color: #666; font-size: 0.9rem;">Accuracy Rate</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 600; color: #9c27b0;">2.3h</div>
                            <div style="color: #666; font-size: 0.9rem;">Avg Response Time</div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }
];

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

console.log('🎨 DelayGuard Screenshot Generator');
console.log('=====================================');
console.log('');

// Generate HTML files for each screenshot
screenshots.forEach((screenshot, index) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${screenshot.title} - DelayGuard</title>
    <style>
        body {
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .screenshot-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
            max-width: 1200px;
            width: 100%;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2rem;
            font-weight: 700;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.1rem;
        }
        .content {
            padding: 40px;
        }
    </style>
</head>
<body>
    <div class="screenshot-container">
        <div class="header">
            <h1>DelayGuard</h1>
            <p>${screenshot.title}</p>
        </div>
        <div class="content">
            ${screenshot.content}
        </div>
    </div>
</body>
</html>
    `;
    
    const htmlFile = path.join(screenshotsDir, `${screenshot.id}.html`);
    fs.writeFileSync(htmlFile, htmlContent);
    
    console.log(`✅ Generated ${screenshot.title} (${screenshot.filename})`);
});

console.log('');
console.log('📸 Screenshot Generation Complete!');
console.log('');
console.log('Next steps:');
console.log('1. Open each HTML file in a browser');
console.log('2. Take screenshots at 1200x800 resolution');
console.log('3. Save as PNG files in the screenshots/ directory');
console.log('');
console.log('Files created:');
screenshots.forEach(screenshot => {
    console.log(`   - screenshots/${screenshot.id}.html`);
});
console.log('');
console.log('🎯 Ready for Shopify App Store submission!');
