/**
 * @fileoverview Comprehensive API Documentation for DelayGuard
 *
 * This file contains OpenAPI 3.0 documentation for all DelayGuard API endpoints.
 * It provides detailed specifications for request/response formats, authentication,
 * error handling, and examples for each endpoint.
 *
 * @author DelayGuard Development Team
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     ShopifyAuth:
 *       type: oauth2
 *       description: Shopify OAuth 2.0 authentication
 *       flows:
 *         authorizationCode:
 *           authorizationUrl: https://delayguard-api.vercel.app/auth
 *           tokenUrl: https://delayguard-api.vercel.app/auth/callback
 *           scopes:
 *             read_orders: Read order information
 *             write_orders: Write order information
 *             read_fulfillments: Read fulfillment information
 *             write_fulfillments: Write fulfillment information
 *     ApiKey:
 *       type: apiKey
 *       in: header
 *       name: X-API-Key
 *       description: API key for external integrations
 *
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 *         code:
 *           type: string
 *           description: Error code
 *         details:
 *           type: object
 *           description: Additional error details
 *
 *     HealthCheck:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, error]
 *           description: Overall health status
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Health check timestamp
 *         services:
 *           type: object
 *           properties:
 *             database:
 *               type: boolean
 *               description: Database connectivity
 *             redis:
 *               type: boolean
 *               description: Redis connectivity
 *             shipengine:
 *               type: boolean
 *               description: ShipEngine API connectivity
 *             sendgrid:
 *               type: boolean
 *               description: SendGrid API connectivity
 *             twilio:
 *               type: boolean
 *               description: Twilio API connectivity
 *
 *     DelayAlert:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique alert identifier
 *         orderId:
 *           type: string
 *           description: Associated order ID
 *         trackingNumber:
 *           type: string
 *           description: Package tracking number
 *         carrierCode:
 *           type: string
 *           description: Shipping carrier code
 *         delayDays:
 *           type: number
 *           description: Number of days delayed
 *         status:
 *           type: string
 *           enum: [active, resolved, dismissed]
 *           description: Alert status
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Alert creation timestamp
 *         resolvedAt:
 *           type: string
 *           format: date-time
 *           description: Alert resolution timestamp
 *
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Order identifier
 *         orderNumber:
 *           type: string
 *           description: Human-readable order number
 *         customerName:
 *           type: string
 *           description: Customer name
 *         customerEmail:
 *           type: string
 *           format: email
 *           description: Customer email address
 *         status:
 *           type: string
 *           enum: [pending, paid, fulfilled, shipped, delivered]
 *           description: Order status
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Order creation timestamp
 *
 *     TrackingInfo:
 *       type: object
 *       properties:
 *         trackingNumber:
 *           type: string
 *           description: Package tracking number
 *         carrierCode:
 *           type: string
 *           description: Shipping carrier code
 *         status:
 *           type: string
 *           description: Current tracking status
 *         estimatedDeliveryDate:
 *           type: string
 *           format: date
 *           description: Estimated delivery date
 *         originalEstimatedDeliveryDate:
 *           type: string
 *           format: date
 *           description: Original estimated delivery date
 *         events:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *
 *     DelayDetectionResult:
 *       type: object
 *       properties:
 *         isDelayed:
 *           type: boolean
 *           description: Whether the package is delayed
 *         delayDays:
 *           type: number
 *           description: Number of days delayed
 *         estimatedDelivery:
 *           type: string
 *           format: date
 *           description: Current estimated delivery date
 *         originalDelivery:
 *           type: string
 *           format: date
 *           description: Original estimated delivery date
 *         error:
 *           type: string
 *           description: Error message if detection failed
 *
 *     AppSettings:
 *       type: object
 *       properties:
 *         delayThresholdDays:
 *           type: number
 *           minimum: 0
 *           maximum: 30
 *           description: Minimum days of delay to trigger alerts
 *         emailEnabled:
 *           type: boolean
 *           description: Whether email notifications are enabled
 *         smsEnabled:
 *           type: boolean
 *           description: Whether SMS notifications are enabled
 *         emailTemplate:
 *           type: string
 *           description: Custom email template
 *         smsTemplate:
 *           type: string
 *           description: Custom SMS template
 *
 *     StatsData:
 *       type: object
 *       properties:
 *         totalAlerts:
 *           type: number
 *           description: Total number of alerts
 *         activeAlerts:
 *           type: number
 *           description: Number of active alerts
 *         resolvedAlerts:
 *           type: number
 *           description: Number of resolved alerts
 *         avgResolutionTime:
 *           type: string
 *           description: Average time to resolve alerts
 *         customerSatisfaction:
 *           type: string
 *           description: Customer satisfaction percentage
 *         supportTicketReduction:
 *           type: string
 *           description: Reduction in support tickets
 *
 * tags:
 *   - name: System
 *     description: System health and monitoring endpoints
 *   - name: Settings
 *     description: Application settings management
 *   - name: Alerts
 *     description: Delay alert management
 *   - name: Orders
 *     description: Order tracking and management
 *   - name: Analytics
 *     description: Analytics and reporting
 *   - name: Testing
 *     description: Testing and debugging endpoints
 */

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health Check
 *     description: Returns the health status of the DelayGuard API and all connected services
 *     tags: [System]
 *     security:
 *       - ShopifyAuth: []
 *     responses:
 *       200:
 *         description: Health check successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *         headers:
 *           X-Response-Time:
 *             description: Response time in milliseconds
 *             schema:
 *               type: string
 *           X-Cache:
 *             description: Cache status
 *             schema:
 *               type: string
 *               enum: [HIT, MISS]
 *       500:
 *         description: Health check failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /api/settings:
 *   get:
 *     summary: Get Application Settings
 *     description: Retrieves the current application settings for the authenticated shop
 *     tags: [Settings]
 *     security:
 *       - ShopifyAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppSettings'
 *         headers:
 *           X-Response-Time:
 *             description: Response time in milliseconds
 *             schema:
 *               type: string
 *           X-Cache:
 *             description: Cache status
 *             schema:
 *               type: string
 *               enum: [HIT, MISS]
 *       500:
 *         description: Failed to retrieve settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   put:
 *     summary: Update Application Settings
 *     description: Updates the application settings for the authenticated shop
 *     tags: [Settings]
 *     security:
 *       - ShopifyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppSettings'
 *           example:
 *             delayThresholdDays: 2
 *             emailEnabled: true
 *             smsEnabled: false
 *             emailTemplate: "Your order {{orderNumber}} is delayed by {{delayDays}} days."
 *             smsTemplate: "Order {{orderNumber}} delayed by {{delayDays}} days."
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *         headers:
 *           X-Response-Time:
 *             description: Response time in milliseconds
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid settings data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to update settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /api/alerts:
 *   get:
 *     summary: Get Delay Alerts
 *     description: Retrieves a paginated list of delay alerts for the authenticated shop
 *     tags: [Alerts]
 *     security:
 *       - ShopifyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of alerts per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, resolved, dismissed]
 *         description: Filter alerts by status
 *     responses:
 *       200:
 *         description: Alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alerts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DelayAlert'
 *                 total:
 *                   type: number
 *                   description: Total number of alerts
 *                 page:
 *                   type: number
 *                   description: Current page number
 *                 limit:
 *                   type: number
 *                   description: Number of alerts per page
 *         headers:
 *           X-Response-Time:
 *             description: Response time in milliseconds
 *             schema:
 *               type: string
 *           X-Cache:
 *             description: Cache status
 *             schema:
 *               type: string
 *               enum: [HIT, MISS]
 *       500:
 *         description: Failed to retrieve alerts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /api/orders:
 *   get:
 *     summary: Get Recent Orders
 *     description: Retrieves a list of recent orders for the authenticated shop
 *     tags: [Orders]
 *     security:
 *       - ShopifyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of orders per page
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 total:
 *                   type: number
 *                   description: Total number of orders
 *                 page:
 *                   type: number
 *                   description: Current page number
 *                 limit:
 *                   type: number
 *                   description: Number of orders per page
 *         headers:
 *           X-Response-Time:
 *             description: Response time in milliseconds
 *             schema:
 *               type: string
 *           X-Cache:
 *             description: Cache status
 *             schema:
 *               type: string
 *               enum: [HIT, MISS]
 *       500:
 *         description: Failed to retrieve orders
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /api/stats:
 *   get:
 *     summary: Get Application Statistics
 *     description: Retrieves comprehensive statistics and metrics for the authenticated shop
 *     tags: [Analytics]
 *     security:
 *       - ShopifyAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsData'
 *         headers:
 *           X-Response-Time:
 *             description: Response time in milliseconds
 *             schema:
 *               type: string
 *           X-Cache:
 *             description: Cache status
 *             schema:
 *               type: string
 *               enum: [HIT, MISS]
 *       500:
 *         description: Failed to retrieve statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /api/test-delay:
 *   post:
 *     summary: Test Delay Detection
 *     description: Tests the delay detection system with provided tracking information
 *     tags: [Testing]
 *     security:
 *       - ShopifyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trackingNumber, carrierCode]
 *             properties:
 *               trackingNumber:
 *                 type: string
 *                 description: Package tracking number
 *                 example: "1Z999AA1234567890"
 *               carrierCode:
 *                 type: string
 *                 description: Shipping carrier code
 *                 example: "ups"
 *           example:
 *             trackingNumber: "1Z999AA1234567890"
 *             carrierCode: "ups"
 *     responses:
 *       200:
 *         description: Delay detection test completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trackingInfo:
 *                   $ref: '#/components/schemas/TrackingInfo'
 *                 delayResult:
 *                   $ref: '#/components/schemas/DelayDetectionResult'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Delay detection test failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

export default {};
