# DelayGuard Coding Practices & Standards
## AI Agent Development Guidelines

**Project**: DelayGuard Shopify App  
**Tech Stack**: Node.js 20+, TypeScript, React 18+, Shopify Polaris, Jest, TDD  
**Target**: AI Agents & LLMs working on this codebase  

---

## 🎯 Core Principles (MANDATORY)

### 1. **Test-Driven Development (TDD) - NON-NEGOTIABLE**
- **ALWAYS write tests FIRST** before implementing any functionality
- **Red → Green → Refactor** cycle is mandatory
- **Test coverage must be ≥80%** for all new code
- **Every public method/function MUST have tests**
- **Integration tests for all API endpoints**
- **E2E tests for critical user flows**

### 2. **Type Safety - STRICT**
- **Use TypeScript strict mode** - no `any` types allowed
- **Define interfaces for all data structures**
- **Use generics for reusable components**
- **Export types from centralized location (`src/types/index.ts`)**
- **No runtime type checking - compile-time only**

### 3. **Code Organization - CLEAR**
- **Single Responsibility Principle** - one function, one purpose
- **Dependency Injection** - services receive dependencies via constructor
- **Interface Segregation** - small, focused interfaces
- **Composition over Inheritance**

---

## 📁 Project Structure Standards

```
src/
├── components/          # React components (Polaris-based)
├── services/           # Business logic services
├── utils/              # Pure utility functions
├── types/              # TypeScript type definitions
├── tests/              # Test files (co-located with source)
└── __tests__/          # Integration/E2E tests

tests/
├── unit/               # Unit tests
├── integration/        # Integration tests
└── e2e/                # End-to-end tests
```

---

## 🧪 Testing Standards (TDD FOCUS)

### **TDD Workflow (MANDATORY)**
```typescript
// 1. Write failing test FIRST
describe('DelayDetectionService', () => {
  it('should detect delay when estimated delivery is past original', () => {
    // Arrange
    const trackingData = createMockTrackingData({
      estimatedDeliveryDate: '2024-02-15',
      originalEstimatedDeliveryDate: '2024-02-10'
    });
    
    // Act
    const result = delayDetectionService.checkForDelays(trackingData);
    
    // Assert
    expect(result.isDelayed).toBe(true);
    expect(result.delayDays).toBe(5);
  });
});

// 2. Run test (expect fail)
// npm test

// 3. Write minimal code to pass
// 4. Refactor while keeping tests green
```

### **Test Requirements**
- **AAA Pattern**: Arrange, Act, Assert
- **Descriptive test names**: "should [expected behavior] when [condition]"
- **One assertion per test** (when possible)
- **Mock external dependencies** (APIs, databases, services)
- **Test edge cases and error conditions**
- **Use factories for test data creation**

### **Testing Tools**
- **Jest** for unit/integration tests
- **React Testing Library** for frontend components
- **Supertest** for API endpoint testing
- **MSW** for API mocking
- **Cypress** for E2E testing

---

## 🔧 TypeScript Standards

### **Type Definitions**
```typescript
// ✅ GOOD: Comprehensive interface
export interface OrderInfo {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shopDomain: string;
  createdAt: Date;
}

// ✅ GOOD: Generic utility type
export type ApiResponse<T> = {
  data: T;
  success: boolean;
  error?: string;
};

// ✅ GOOD: Result pattern for operations that can fail
export type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};
```

### **Service Classes**
```typescript
// ✅ GOOD: Dependency injection
export class NotificationService {
  constructor(
    private emailService: EmailService,
    private smsService: SMSService
  ) {}
  
  async sendDelayNotification(orderInfo: OrderInfo, delayDetails: DelayDetails): Promise<void> {
    // Implementation
  }
}
```

### **Error Handling**
```typescript
// ✅ GOOD: Specific error types
export class DelayDetectionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'DelayDetectionError';
  }
}

// ✅ GOOD: Custom error for API failures
export class ApiError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'ApiError';
  }
}
```

---

## ⚛️ React/Component Standards

### **Component Structure**
```typescript
// ✅ GOOD: Functional component with proper typing
interface DelayGuardDashboardProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function DelayGuardDashboard({ settings, onSettingsChange }: DelayGuardDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Component logic
  
  return (
    <Page title="DelayGuard Settings">
      {/* Polaris components */}
    </Page>
  );
}
```

### **State Management (Zustand)**
```typescript
// ✅ GOOD: Zustand store with TypeScript
interface SettingsStore {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  isLoading: boolean;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: defaultSettings,
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),
  isLoading: false
}));
```

### **Polaris Integration**
- **Use Polaris components exclusively** for UI
- **Follow Polaris design patterns**
- **Maintain consistent spacing and typography**
- **Use Polaris icons and color tokens**

---

## 🔌 Backend Standards (Node.js/Express)

### **Async/Await Patterns**
```typescript
// ✅ GOOD: Proper async error handling
async function processOrderUpdate(orderData: OrderUpdateWebhook): Promise<void> {
  try {
    const order = await orderRepository.findById(orderData.id);
    if (!order) {
      throw new Error(`Order ${orderData.id} not found`);
    }
    
    const delayResult = await delayDetectionService.checkForDelays(order);
    if (delayResult.isDelayed) {
      await notificationService.sendDelayNotification(order, delayResult);
    }
  } catch (error) {
    logger.error('Failed to process order update', { orderId: orderData.id, error });
    throw error;
  }
}
```

### **API Routes**
```typescript
// ✅ GOOD: RESTful routes with validation
app.post('/webhooks/orders/updated', 
  validateWebhook,           // HMAC verification
  rateLimit(1000, 15 * 60),  // Rate limiting
  async (req, res) => {
    try {
      await processOrderUpdate(req.body);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
```

### **Queue Processing (BullMQ)**
```typescript
// ✅ GOOD: Queue job with proper typing
interface DelayCheckJob {
  orderId: string;
  trackingNumber: string;
  carrierCode: string;
}

const delayCheckWorker = new Worker('delay-check', async (job: Job<DelayCheckJob>) => {
  const { orderId, trackingNumber, carrierCode } = job.data;
  // Process with error handling and retry logic
}, { 
  connection,
  concurrency: 5,
  removeOnComplete: 100,
  removeOnFail: 50
});
```

---

## 🗄️ Database Standards (Supabase/PostgreSQL)

### **Database Operations**
```typescript
// ✅ GOOD: Repository pattern with Prisma
export class OrderRepository {
  constructor(private db: PrismaClient) {}
  
  async findById(id: string): Promise<OrderInfo | null> {
    return this.db.order.findUnique({
      where: { id },
      include: { fulfillments: true }
    });
  }
  
  async save(order: OrderInfo): Promise<void> {
    await this.db.order.upsert({
      where: { id: order.id },
      update: order,
      create: order
    });
  }
}
```

### **Migration Strategy**
- **Version all database changes**
- **Backward compatibility for schema changes**
- **Test migrations with sample data**
- **Use Prisma migrations**: `prisma migrate dev`

---

## 🔄 API Integration Standards

### **Shopify Integration**
```typescript
// ✅ GOOD: Typed GraphQL queries
const ORDER_QUERY = `
  query getOrder($id: ID!) {
    order(id: $id) {
      id
      name
      email
      fulfillments {
        id
        trackingInfo {
          number
          company
        }
      }
    }
  }
`;

// ✅ GOOD: Batched GraphQL requests
async function batchOrderQueries(orderIds: string[]): Promise<OrderInfo[]> {
  const queries = orderIds.map(id => ({ query: ORDER_QUERY, variables: { id } }));
  const results = await shopifyClient.batch(queries);
  return results.map(result => result.data.order);
}
```

### **External API Integration**
```typescript
// ✅ GOOD: Service abstraction with retry logic
export class ShipEngineService {
  constructor(private apiKey: string) {}
  
  async getTrackingInfo(trackingNumber: string, carrierCode: string): Promise<TrackingInfo> {
    return retry(
      () => this.fetchTrackingData(trackingNumber, carrierCode),
      { retries: 3, factor: 2, minTimeout: 1000 }
    );
  }
}
```

---

## 🚀 Performance & Optimization

### **Caching Strategy**
```typescript
// ✅ GOOD: Redis caching with TTL
export class TrackingCache {
  constructor(private redis: Redis) {}
  
  async getCachedTracking(trackingNumber: string): Promise<TrackingInfo | null> {
    const cached = await this.redis.get(`tracking:${trackingNumber}`);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setCachedTracking(trackingNumber: string, data: TrackingInfo, ttl: number = 3600): Promise<void> {
    await this.redis.setex(`tracking:${trackingNumber}`, ttl, JSON.stringify(data));
  }
}
```

### **Performance Monitoring**
- **Use Vercel Analytics** for frontend performance
- **Node --inspect** for backend profiling
- **Sentry** for error tracking and performance monitoring
- **Prometheus/Grafana** for queue metrics

---

## 🔒 Security Standards

### **Input Validation**
```typescript
// ✅ GOOD: Input validation with Zod
const webhookSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  fulfillments: z.array(z.object({
    tracking_number: z.string(),
    tracking_company: z.string()
  }))
});

export function validateWebhook(data: unknown): OrderUpdateWebhook {
  return webhookSchema.parse(data);
}
```

### **Security Headers**
```typescript
// ✅ GOOD: Security middleware
app.use(helmet());
app.use(xss());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
}));
```

### **Environment Variables**
- **Never commit secrets** to version control
- **Use environment variables** for all configuration
- **Validate required environment variables** at startup
- **Use different configs** for dev/staging/production

---

## 🧹 Code Quality Standards

### **Linting & Formatting**
- **ESLint with TypeScript rules**
- **Prettier for code formatting**
- **Pre-commit hooks** for linting and testing
- **No console.log in production code**

### **Git Standards**
```bash
# ✅ GOOD: Semantic commit messages
git commit -m "feat: add delay detection for UPS packages"
git commit -m "fix: handle missing tracking numbers gracefully"
git commit -m "test: add integration tests for notification service"
git commit -m "refactor: extract delay detection logic to service"
```

### **Code Review Checklist**
- [ ] All tests pass (unit, integration, e2e)
- [ ] Test coverage ≥80%
- [ ] TypeScript compiles without errors
- [ ] No console.log statements
- [ ] Proper error handling
- [ ] Documentation updated
- [ ] Security considerations addressed

---

## 🤖 AI Agent Specific Guidelines

### **When Working on This Codebase:**

1. **ALWAYS run tests before and after changes**
   ```bash
   npm test
   npm run test:coverage
   npm run lint
   npm run type-check
   ```

2. **Follow TDD religiously**
   - Write failing test first
   - Implement minimal code to pass
   - Refactor while keeping tests green

3. **Use existing patterns**
   - Follow established service patterns
   - Use existing type definitions
   - Maintain consistent error handling

4. **Document your changes**
   - Update relevant documentation
   - Add comments for complex logic
   - Update README if needed

5. **Validate your work**
   - Ensure all tests pass
   - Check TypeScript compilation
   - Verify no linting errors

### **Common Pitfalls to Avoid:**
- ❌ Don't use `any` types
- ❌ Don't skip writing tests
- ❌ Don't commit console.log statements
- ❌ Don't ignore error handling
- ❌ Don't break existing functionality
- ❌ Don't use deprecated patterns

### **Success Metrics:**
- ✅ All tests passing
- ✅ 80%+ test coverage
- ✅ Zero TypeScript errors
- ✅ Zero linting errors
- ✅ Clean git history
- ✅ Proper error handling

---

## 📋 Development Workflow

### **Daily Development Process:**
1. **Pull latest changes**
2. **Run tests to ensure clean state**
3. **Write failing test for new feature**
4. **Implement minimal code to pass test**
5. **Refactor while keeping tests green**
6. **Run full test suite**
7. **Commit with descriptive message**

### **Before Committing:**
```bash
npm test                    # Run all tests
npm run test:coverage      # Check coverage
npm run lint              # Check linting
npm run type-check        # Check TypeScript
```

### **CI/CD Pipeline:**
- **GitHub Actions**: lint/test/build on PR
- **Vercel**: Git-based deploys with environment variables
- **Sentry**: Monitor post-deploy for errors
- **Rollback**: Use Vercel previews for safe rollbacks

---

## 🔍 Monitoring & Logging

### **Structured Logging**
```typescript
// ✅ GOOD: Structured logging with context
logger.info('Webhook processed', {
  shopId: shopId,
  orderId: orderId,
  processingTime: Date.now() - startTime
});

logger.error('Failed to process order', {
  shopId: shopId,
  orderId: orderId,
  error: error.message,
  stack: error.stack
});
```

### **Error Tracking**
- **Sentry** for exception capture
- **Breadcrumbs** for webhook processing
- **Custom metrics** for business logic
- **Alert thresholds** for critical errors

---

**Remember: Quality over speed. Every line of code should be testable, maintainable, and follow these standards.**
