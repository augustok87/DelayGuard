/**
 * Swagger configuration for DelayGuard API
 * Generates OpenAPI 3.0 documentation for all API endpoints
 */

module.exports = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DelayGuard API',
      version: '1.0.0',
      description: 'Proactive shipping delay notification API for Shopify merchants',
      contact: {
        name: 'DelayGuard Support',
        email: 'support@delayguard.com',
        url: 'https://delayguard.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://delayguard-api.vercel.app',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        ShopifyAuth: {
          type: 'oauth2',
          description: 'Shopify OAuth 2.0 authentication',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://delayguard-api.vercel.app/auth',
              tokenUrl: 'https://delayguard-api.vercel.app/auth/callback',
              scopes: {
                'read_orders': 'Read order information',
                'write_orders': 'Write order information',
                'read_fulfillments': 'Read fulfillment information',
                'write_fulfillments': 'Write fulfillment information'
              }
            }
          }
        },
        ApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for external integrations'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['success', 'error'],
              description: 'Overall health status'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Health check timestamp'
            },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'boolean',
                  description: 'Database connectivity'
                },
                redis: {
                  type: 'boolean',
                  description: 'Redis connectivity'
                },
                shipengine: {
                  type: 'boolean',
                  description: 'ShipEngine API connectivity'
                },
                sendgrid: {
                  type: 'boolean',
                  description: 'SendGrid API connectivity'
                },
                twilio: {
                  type: 'boolean',
                  description: 'Twilio API connectivity'
                }
              }
            }
          }
        },
        DelayAlert: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique alert identifier'
            },
            orderId: {
              type: 'string',
              description: 'Associated order ID'
            },
            trackingNumber: {
              type: 'string',
              description: 'Package tracking number'
            },
            carrierCode: {
              type: 'string',
              description: 'Shipping carrier code'
            },
            delayDays: {
              type: 'number',
              description: 'Number of days delayed'
            },
            status: {
              type: 'string',
              enum: ['active', 'resolved', 'dismissed'],
              description: 'Alert status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Alert creation timestamp'
            },
            resolvedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Alert resolution timestamp'
            }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Order identifier'
            },
            orderNumber: {
              type: 'string',
              description: 'Human-readable order number'
            },
            customerName: {
              type: 'string',
              description: 'Customer name'
            },
            customerEmail: {
              type: 'string',
              format: 'email',
              description: 'Customer email address'
            },
            status: {
              type: 'string',
              enum: ['pending', 'paid', 'fulfilled', 'shipped', 'delivered'],
              description: 'Order status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Order creation timestamp'
            }
          }
        },
        TrackingInfo: {
          type: 'object',
          properties: {
            trackingNumber: {
              type: 'string',
              description: 'Package tracking number'
            },
            carrierCode: {
              type: 'string',
              description: 'Shipping carrier code'
            },
            status: {
              type: 'string',
              description: 'Current tracking status'
            },
            estimatedDeliveryDate: {
              type: 'string',
              format: 'date',
              description: 'Estimated delivery date'
            },
            originalEstimatedDeliveryDate: {
              type: 'string',
              format: 'date',
              description: 'Original estimated delivery date'
            },
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timestamp: {
                    type: 'string',
                    format: 'date-time'
                  },
                  location: {
                    type: 'string'
                  },
                  description: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        DelayDetectionResult: {
          type: 'object',
          properties: {
            isDelayed: {
              type: 'boolean',
              description: 'Whether the package is delayed'
            },
            delayDays: {
              type: 'number',
              description: 'Number of days delayed'
            },
            estimatedDelivery: {
              type: 'string',
              format: 'date',
              description: 'Current estimated delivery date'
            },
            originalDelivery: {
              type: 'string',
              format: 'date',
              description: 'Original estimated delivery date'
            },
            error: {
              type: 'string',
              description: 'Error message if detection failed'
            }
          }
        }
      }
    },
    security: [
      {
        ShopifyAuth: ['read_orders', 'write_orders', 'read_fulfillments', 'write_fulfillments']
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/server.ts']
};
