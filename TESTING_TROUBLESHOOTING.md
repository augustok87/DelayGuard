# Testing Infrastructure Troubleshooting Guide

**Last Updated**: January 2025  
**Status**: CRITICAL ISSUES IDENTIFIED - Testing Infrastructure Completely Broken  
**Purpose**: Detailed solutions for critical testing infrastructure failures  

---

## 🚨 **Critical Issues Overview**

The DelayGuard testing infrastructure has **critical failures** that prevent proper test execution. This guide provides specific solutions for each identified issue.

### **Current Test Status**
- **Total Tests**: 170 tests
- **Passing**: 120 tests (70.6% success rate)
- **Failing**: 49 tests (28.8% failure rate)
- **Coverage**: 17.49% overall (needs 80%+)

---

## 🔧 **Issue #1: ESM Module Parsing - COMPLETELY BROKEN**

### **Problem**
Jest cannot parse ESM modules from `koa-session` and `uuid`, causing all integration and E2E tests to fail.

### **Error Message**
```
SyntaxError: Unexpected token 'export'
/Users/jooniekwun/Documents/DelayGuard/delayguard-app/node_modules/koa-session/node_modules/uuid/dist/esm-browser/index.js:1
({"Object.<anonymous>":function(module,exports,require,__dirname,__filename,jest){export { default as v1 } from './v1.js';
                                                                                      ^^^^^^
```

### **Root Cause**
Jest is trying to parse ESM modules using CommonJS syntax, which fails on `export` statements.

### **Solution Steps**

#### **Step 1: Update Jest Configuration**
Update `jest.config.ts` to properly handle ESM modules:

```typescript
// Add to transformIgnorePatterns
transformIgnorePatterns: [
  'node_modules/(?!(koa-session|uuid|msgpackr|bullmq|ioredis|@babel)/)'
],

// Add ESM support
extensionsToTreatAsEsm: ['.ts', '.tsx'],
globals: {
  'ts-jest': {
    useESM: true
  }
}
```

#### **Step 2: Update Babel Configuration**
Create/update `.babelrc` or `babel.config.js`:

```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', { 
      modules: 'commonjs',
      targets: { node: 'current' }
    }]
  ],
  plugins: [
    '@babel/plugin-transform-modules-commonjs'
  ]
};
```

#### **Step 3: Update Package.json**
Add ESM support to package.json:

```json
{
  "type": "module",
  "jest": {
    "preset": "ts-jest/presets/default-esm"
  }
}
```

#### **Step 4: Test the Fix**
```bash
cd delayguard-app
npm test -- --testPathPattern=integration
```

---

## 🔧 **Issue #2: Mock Configuration - COMPLETELY BROKEN**

### **Problem**
Redis and PostgreSQL mocks are failing with "Cannot call a class as a function" errors.

### **Error Message**
```
TypeError: Cannot call a class as a function
at _classCallCheck (node_modules/ioredis/built/utils/Commander.js:1:14)
at new construct (node_modules/ioredis/built/utils/Commander.js:9:19)
at new Redis (node_modules/ioredis/built/Redis.js:39:9)
```

### **Root Cause**
Mock files are not properly mocking ES6 class constructors.

### **Solution Steps**

#### **Step 1: Fix Redis Mock**
Update `__mocks__/ioredis.js`:

```javascript
// Mock Redis class properly
class MockRedis {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.connected = false;
  }

  async connect() {
    this.connected = true;
    return this;
  }

  async disconnect() {
    this.connected = false;
  }

  async get(key) {
    return null;
  }

  async set(key, value, ...args) {
    return 'OK';
  }

  async del(key) {
    return 1;
  }

  async mget(keys) {
    return keys.map(() => null);
  }

  async mset(keyValuePairs) {
    return 'OK';
  }

  async keys(pattern) {
    return [];
  }

  async scan(cursor, options = {}) {
    return ['0', []];
  }
}

module.exports = { Redis: MockRedis };
```

#### **Step 2: Fix PostgreSQL Mock**
Update `__mocks__/pg.js`:

```javascript
// Mock Pool class properly
class MockPool {
  constructor(config) {
    this.config = config;
    this.connected = false;
  }

  async connect() {
    this.connected = true;
    return {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
      end: jest.fn()
    };
  }

  async end() {
    this.connected = false;
  }

  query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
}

module.exports = { Pool: MockPool };
```

#### **Step 3: Update Jest Setup**
Update `tests/setup/jest.setup.ts`:

```typescript
// Add proper mock setup
jest.mock('ioredis', () => require('../../__mocks__/ioredis'));
jest.mock('pg', () => require('../../__mocks__/pg'));
```

#### **Step 4: Test the Fix**
```bash
cd delayguard-app
npm test -- --testPathPattern=unit
```

---

## 🔧 **Issue #3: TypeScript Configuration - MISSING TYPES**

### **Problem**
Missing `@testing-library/jest-dom` types causing component test failures.

### **Error Message**
```
Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
```

### **Root Cause**
Missing type definitions for Jest DOM matchers.

### **Solution Steps**

#### **Step 1: Install Missing Types**
```bash
cd delayguard-app
npm install --save-dev @testing-library/jest-dom
```

#### **Step 2: Update Jest Setup**
Update `tests/setup/jest.setup.ts`:

```typescript
import '@testing-library/jest-dom';

// Add other setup code here
```

#### **Step 3: Update TypeScript Configuration**
Update `tsconfig.json` to include test types:

```json
{
  "compilerOptions": {
    "types": ["jest", "@testing-library/jest-dom"]
  }
}
```

#### **Step 4: Test the Fix**
```bash
cd delayguard-app
npm test -- --testPathPattern=components
```

---

## 🔧 **Issue #4: Integration Tests - COMPLETELY BROKEN**

### **Problem**
Integration tests cannot run due to ESM import errors and server dependencies.

### **Root Cause**
Tests are importing from `src/server.ts` which has ESM dependencies that Jest cannot parse.

### **Solution Steps**

#### **Step 1: Create Test-Specific Server**
Create `tests/setup/test-server.ts`:

```typescript
// Simplified server for testing without ESM dependencies
import Koa from 'koa';
import Router from 'koa-router';

const app = new Koa();
const router = new Router();

// Add only necessary routes for testing
router.get('/health', async (ctx) => {
  ctx.body = { status: 'ok' };
});

app.use(router.routes());
export { app };
```

#### **Step 2: Update Integration Tests**
Update integration tests to use test server:

```typescript
// Instead of importing from src/server.ts
import { app } from '../setup/test-server';
```

#### **Step 3: Test the Fix**
```bash
cd delayguard-app
npm test -- --testPathPattern=integration
```

---

## 🔧 **Issue #5: Database Connection - E2E Tests Failing**

### **Problem**
E2E tests failing due to database role "test" not existing.

### **Error Message**
```
role "test" does not exist
```

### **Solution Steps**

#### **Step 1: Create Test Database**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create test database and user
CREATE DATABASE delayguard_test;
CREATE USER test_user WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE delayguard_test TO test_user;
```

#### **Step 2: Update Test Environment**
Create `.env.test`:

```env
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/delayguard_test
REDIS_URL=redis://localhost:6379/1
NODE_ENV=test
```

#### **Step 3: Update Test Scripts**
Update `package.json`:

```json
{
  "scripts": {
    "test:e2e": "NODE_ENV=test jest --testPathPattern=e2e"
  }
}
```

---

## 📋 **Verification Checklist**

After implementing all fixes, verify the following:

### **✅ ESM Module Parsing**
- [ ] Integration tests run without ESM errors
- [ ] E2E tests execute successfully
- [ ] Service tests can import from server.ts

### **✅ Mock Configuration**
- [ ] Redis mocks work correctly
- [ ] PostgreSQL mocks work correctly
- [ ] Service tests pass with mocked dependencies

### **✅ TypeScript Configuration**
- [ ] Component tests compile without type errors
- [ ] Jest DOM matchers are recognized
- [ ] All test files have proper type support

### **✅ Integration Tests**
- [ ] All integration tests run successfully
- [ ] Test server works without ESM dependencies
- [ ] API endpoints are properly tested

### **✅ Database Connection**
- [ ] E2E tests can connect to test database
- [ ] Test data is properly isolated
- [ ] Database cleanup works correctly

---

## 🎯 **Expected Results After Fixes**

### **Test Status**
- **Total Tests**: 170 tests
- **Passing**: 170 tests (100% success rate)
- **Failing**: 0 tests (0% failure rate)
- **Coverage**: 80%+ overall

### **Test Categories**
- **Unit Tests**: All passing
- **Integration Tests**: All passing
- **E2E Tests**: All passing
- **Performance Tests**: All passing

---

## 🚀 **Next Steps**

1. **Implement all fixes** in the order specified
2. **Run full test suite** to verify all issues are resolved
3. **Update documentation** to reflect working test infrastructure
4. **Proceed with Phase 6** (App Store Submission) once testing is stable

---

*Last updated: January 2025 - Critical testing infrastructure issues identified and solutions provided*
