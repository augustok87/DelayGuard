# Mock Configuration Troubleshooting Guide

**Date**: January 2025  
**Status**: CRITICAL ISSUE - Mock Configuration Failures  
**Impact**: Unit service tests failing  

---

## 🚨 **Current Issues**

### **Redis Mock Failures**
```
TypeError: ioredis_1.Redis is not a constructor
```

### **PostgreSQL Mock Failures**
```
TypeError: Cannot call a class as a function
```

---

## 🔍 **Root Cause Analysis**

### **Problem**
- Mock files are not properly configured for ES modules
- Jest is not transforming the mocked modules correctly
- Mock implementations don't match the actual module exports

### **Affected Files**
- `tests/unit/monitoring-service.test.ts`
- `tests/unit/analytics-service.test.ts`
- `tests/unit/optimized-cache.test.ts`
- Any test that uses Redis or PostgreSQL

---

## 🛠️ **Solution Steps**

### **Step 1: Fix Redis Mock**

Update `__mocks__/ioredis.js`:

```javascript
// Mock Redis class
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
    return 'OK';
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

  async flushall() {
    return 'OK';
  }

  on(event, callback) {
    return this;
  }

  off(event, callback) {
    return this;
  }
}

module.exports = {
  default: MockRedis,
  Redis: MockRedis
};
```

### **Step 2: Fix PostgreSQL Mock**

Update `__mocks__/pg.js`:

```javascript
// Mock Pool class
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

  async query(text, params) {
    return { rows: [], rowCount: 0 };
  }

  async end() {
    this.connected = false;
    return Promise.resolve();
  }

  on(event, callback) {
    return this;
  }

  off(event, callback) {
    return this;
  }
}

// Mock Client class
class MockClient {
  constructor(config) {
    this.config = config;
    this.connected = false;
  }

  async connect() {
    this.connected = true;
    return this;
  }

  async query(text, params) {
    return { rows: [], rowCount: 0 };
  }

  async end() {
    this.connected = false;
    return Promise.resolve();
  }

  on(event, callback) {
    return this;
  }

  off(event, callback) {
    return this;
  }
}

module.exports = {
  Pool: MockPool,
  Client: MockClient,
  default: {
    Pool: MockPool,
    Client: MockClient
  }
};
```

### **Step 3: Update Jest Configuration**

Update `jest.config.ts`:

```typescript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
  '^ioredis$': '<rootDir>/__mocks__/ioredis.js',
  '^pg$': '<rootDir>/__mocks__/pg.js'
}
```

### **Step 4: Update Test Files**

Update test files to use proper mocking:

```typescript
// In test files
import { Pool } from 'pg';
import Redis from 'ioredis';

// Mock the modules
jest.mock('pg');
jest.mock('ioredis');

// Use the mocked classes
const mockPool = Pool as jest.MockedClass<typeof Pool>;
const mockRedis = Redis as jest.MockedClass<typeof Redis>;
```

---

## 🧪 **Testing the Fix**

### **Run Unit Tests**
```bash
cd delayguard-app
npm test -- --testPathPattern="monitoring-service"
```

### **Run All Service Tests**
```bash
cd delayguard-app
npm test -- --testPathPattern="service"
```

### **Check Mock Loading**
```bash
cd delayguard-app
node -e "console.log(require('./__mocks__/ioredis.js'))"
```

---

## 📊 **Expected Results**

After fixing:
- ✅ Redis mocks should work properly
- ✅ PostgreSQL mocks should work properly
- ✅ Service tests should run without constructor errors
- ✅ All unit tests should be able to run

---

## 🔄 **Alternative Solutions**

If mocks continue to fail:

1. **Use jest.mock() in individual test files**
2. **Create factory functions** for mock instances
3. **Use dependency injection** to make services more testable
4. **Use test containers** for integration testing

---

## 📝 **Notes**

- Mock configuration is critical for unit testing
- Ensure mock implementations match actual API
- Consider using test doubles instead of mocks for complex scenarios
- Update mocks when actual module APIs change
