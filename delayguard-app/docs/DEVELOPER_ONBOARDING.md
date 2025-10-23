# 🚀 DelayGuard Developer Onboarding Guide

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Status**: Production Ready

---

## 📋 **Table of Contents**

1. [Quick Start](#quick-start)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Architecture](#project-architecture)
4. [Development Workflow](#development-workflow)
5. [Testing Guidelines](#testing-guidelines)
6. [Code Standards](#code-standards)
7. [Deployment Process](#deployment-process)
8. [Troubleshooting](#troubleshooting)
9. [Contributing Guidelines](#contributing-guidelines)

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 20+ LTS
- PostgreSQL 15+
- Redis 7+
- Git
- VS Code (recommended)

### **5-Minute Setup**
```bash
# Clone and install
git clone <repository-url>
cd delayguard-app
npm install

# Environment setup
cp env.example .env
# Edit .env with your credentials

# Database setup
npm run db:migrate

# Start development
npm run dev
```

**🎉 You're ready to develop!**

---

## 🛠️ **Development Environment Setup**

### **1. System Requirements**

#### **Minimum Requirements**
- **OS**: macOS 12+, Ubuntu 20.04+, Windows 10+
- **RAM**: 8GB (16GB recommended)
- **Storage**: 10GB free space
- **Node.js**: 20.0.0+ (LTS recommended)
- **PostgreSQL**: 15.0+
- **Redis**: 7.0+

#### **Recommended Setup**
- **OS**: macOS 14+ or Ubuntu 22.04+
- **RAM**: 16GB+
- **Storage**: SSD with 20GB+ free space
- **Node.js**: 20.11.0+ (latest LTS)
- **PostgreSQL**: 15.4+
- **Redis**: 7.2+

### **2. Development Tools**

#### **Required Tools**
```bash
# Node.js (via nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# PostgreSQL
# macOS: brew install postgresql@15
# Ubuntu: sudo apt install postgresql-15
# Windows: Download from postgresql.org

# Redis
# macOS: brew install redis
# Ubuntu: sudo apt install redis-server
# Windows: Download from redis.io
```

#### **Recommended VS Code Extensions**
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-jest",
    "ms-vscode.vscode-jest-runner",
    "ms-vscode.vscode-git-graph",
    "ms-vscode.vscode-docker"
  ]
}
```

### **3. Environment Configuration**

#### **Environment Variables**
```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/delayguard_dev
REDIS_URL=redis://localhost:6379

# Shopify
SHOPIFY_API_KEY=your_development_api_key
SHOPIFY_API_SECRET=your_development_api_secret
SHOPIFY_SCOPES=read_orders,write_orders,read_fulfillments,write_fulfillments

# External APIs (Development)
SHIPENGINE_API_KEY=your_shipengine_key
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# App Configuration
NODE_ENV=development
PORT=3000
HOST=localhost
LOG_LEVEL=debug
```

#### **Database Setup**
```bash
# Create development database
createdb delayguard_dev

# Run migrations
npm run db:migrate

# Seed development data (optional)
npm run db:seed
```

---

## 🏗️ **Project Architecture**

### **High-Level Architecture**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Shopify       │    │   DelayGuard     │    │   External      │
│   Webhooks      │───▶│   Backend        │───▶│   APIs          │
│                 │    │                  │    │                 │
│ • orders/updated│    │ • Koa.js Server  │    │ • ShipEngine    │
│ • fulfillments  │    │ • BullMQ Queue   │    │ • SendGrid      │
│ • orders/paid   │    │ • PostgreSQL     │    │ • Twilio        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   React Frontend │
                       │   (Polaris UI)   │
                       └──────────────────┘
```

### **Directory Structure**
```
src/
├── components/          # React components
│   ├── common/         # Shared components
│   ├── features/       # Feature-specific components
│   ├── layout/         # Layout components
│   └── ui/             # UI components
├── hooks/              # Custom React hooks
├── services/           # Business logic services
├── middleware/         # Express/Koa middleware
├── routes/            # API routes
├── database/          # Database utilities
├── queue/             # Queue processors
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── tests/             # Test files
```

### **Key Technologies**
- **Frontend**: React 18+, TypeScript, Shopify Polaris
- **Backend**: Node.js, Koa.js, TypeScript
- **Database**: PostgreSQL with connection pooling
- **Queue**: BullMQ with Redis
- **Caching**: Multi-tier Redis caching
- **Deployment**: Vercel serverless functions

---

## 🔄 **Development Workflow**

### **Git Workflow**
```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push and create PR
git push origin feature/your-feature-name
# Create PR via GitHub

# 4. After review, merge to main
```

### **Branch Naming Convention**
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Critical fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### **Commit Message Convention**
```
type(scope): description

feat(auth): add OAuth 2.0 authentication
fix(api): resolve rate limiting issue
docs(readme): update installation instructions
refactor(components): simplify user interface
test(api): add integration tests for webhooks
```

### **Development Commands**
```bash
# Start development servers
npm run dev                 # Both frontend and backend
npm run dev:server         # Backend only
npm run dev:client         # Frontend only

# Testing
npm test                   # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests

# Code quality
npm run lint               # ESLint
npm run lint:fix           # Fix linting issues
npm run type-check         # TypeScript check
npm run format             # Prettier formatting

# Database
npm run db:migrate         # Run migrations
npm run db:rollback        # Rollback migration
npm run db:seed            # Seed data
npm run db:reset           # Reset database

# Build and deployment
npm run build              # Build for production
npm run build:analyze      # Analyze bundle size
npm run deploy:staging     # Deploy to staging
npm run deploy:production  # Deploy to production
```

---

## 🧪 **Testing Guidelines**

### **Testing Strategy**
- **Unit Tests**: Individual functions and components
- **Integration Tests**: API endpoints and workflows
- **E2E Tests**: Complete user journeys
- **Performance Tests**: Load and stress testing
- **Security Tests**: Security vulnerability testing

### **Test Structure**
```
tests/
├── unit/                 # Unit tests
│   ├── components/      # Component tests
│   ├── services/        # Service tests
│   ├── utils/          # Utility tests
│   └── hooks/          # Hook tests
├── integration/         # Integration tests
├── e2e/                # End-to-end tests
├── performance/        # Performance tests
└── setup/              # Test setup files
```

### **Writing Tests**
```typescript
// Example unit test
describe('DelayDetectionService', () => {
  beforeEach(() => {
    // Setup test data
  });

  it('should detect delay when estimated date is past', async () => {
    const result = await delayDetectionService.checkDelay({
      estimatedDelivery: '2025-01-10',
      currentDate: '2025-01-15'
    });
    
    expect(result.isDelayed).toBe(true);
    expect(result.delayDays).toBe(5);
  });
});
```

### **Test Coverage Goals**
- **Overall Coverage**: 80%+
- **Critical Paths**: 95%+
- **New Code**: 90%+
- **Components**: 85%+

---

## 📝 **Code Standards**

### **TypeScript Guidelines**
```typescript
// Use strict typing
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

// Use generics for reusable code
function createApiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date()
  };
}

// Use enums for constants
enum AlertStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}
```

### **React Component Guidelines**
```typescript
// Use functional components with hooks
interface Props {
  title: string;
  onSave: (data: FormData) => void;
}

export const SettingsForm: React.FC<Props> = ({ title, onSave }) => {
  const [formData, setFormData] = useState<FormData>({});
  
  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    onSave(formData);
  }, [formData, onSave]);
  
  return (
    <form onSubmit={handleSubmit}>
      <h1>{title}</h1>
      {/* Form content */}
    </form>
  );
};
```

### **API Route Guidelines**
```typescript
// Use proper error handling
export const getSettings = async (ctx: Context) => {
  try {
    const settings = await settingsService.getSettings(ctx.state.shop);
    
    ctx.body = {
      success: true,
      data: settings
    };
  } catch (error) {
    logger.error('Failed to get settings', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Internal server error'
    };
  }
};
```

### **Database Guidelines**
```typescript
// Use transactions for data consistency
export const createAlert = async (alertData: AlertData) => {
  return await db.transaction(async (client) => {
    const alert = await client.query(
      'INSERT INTO alerts (order_id, tracking_number, delay_days) VALUES ($1, $2, $3) RETURNING *',
      [alertData.orderId, alertData.trackingNumber, alertData.delayDays]
    );
    
    await client.query(
      'UPDATE orders SET alert_count = alert_count + 1 WHERE id = $1',
      [alertData.orderId]
    );
    
    return alert.rows[0];
  });
};
```

---

## 🚀 **Deployment Process**

### **Environment Promotion**
```
Development → Staging → Production
     ↓           ↓         ↓
   Local     Vercel     Vercel
   Testing   Preview    Production
```

### **Deployment Checklist**
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Performance tests passed
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Monitoring alerts configured

### **Deployment Commands**
```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# Rollback deployment
npm run deploy:rollback
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Database Connection Issues**
```bash
# Check database status
pg_ctl status

# Restart PostgreSQL
brew services restart postgresql

# Check connection
psql -d delayguard_dev -c "SELECT 1;"
```

#### **Redis Connection Issues**
```bash
# Check Redis status
redis-cli ping

# Restart Redis
brew services restart redis

# Check Redis logs
tail -f /usr/local/var/log/redis.log
```

#### **Node.js Issues**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version
npm --version
```

#### **Test Issues**
```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- tests/unit/services/delay-detection.test.ts
```

### **Debugging Tools**
- **VS Code Debugger**: Set breakpoints in code
- **Chrome DevTools**: Debug frontend issues
- **Postman**: Test API endpoints
- **pgAdmin**: Database management
- **Redis Commander**: Redis management

---

## 🤝 **Contributing Guidelines**

### **Code Review Process**
1. **Self Review**: Review your own code before submitting
2. **Peer Review**: At least one team member review
3. **Automated Checks**: All CI/CD checks must pass
4. **Testing**: All tests must pass
5. **Documentation**: Update documentation if needed

### **Pull Request Template**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### **Development Best Practices**
- **Write tests first** (TDD approach)
- **Keep functions small** (max 20 lines)
- **Use descriptive names** for variables and functions
- **Comment complex logic** with why, not what
- **Handle errors gracefully** with proper error messages
- **Use TypeScript strictly** with no `any` types
- **Follow existing patterns** in the codebase

---

## 📚 **Additional Resources**

### **Documentation Links**
- [Project README](../README.md)
- [API Documentation](./api/swagger.json)
- [Architecture Decision Records](./adr/)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Security Guide](./SECURITY_GUIDE.md)

### **External Resources**
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Shopify Polaris](https://polaris.shopify.com/)
- [Koa.js Guide](https://koajs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)

### **Team Contacts**
- **Technical Lead**: [Contact Info]
- **DevOps Engineer**: [Contact Info]
- **Security Engineer**: [Contact Info]
- **Product Manager**: [Contact Info]

---

## 🆘 **Getting Help**

### **Internal Support**
- **Slack**: #delayguard-dev
- **Email**: dev-support@delayguard.com
- **Wiki**: Internal documentation
- **Office Hours**: Tuesday/Thursday 2-4 PM

### **External Support**
- **Stack Overflow**: Tag questions with `delayguard`
- **GitHub Issues**: Create detailed issue reports
- **Community Forums**: Shopify Partner Community

---

**Welcome to the DelayGuard development team! 🚀**

*This guide is living documentation. Please contribute improvements and updates as needed.*
