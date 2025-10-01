# ESM Module Troubleshooting Guide

**Date**: January 2025  
**Status**: CRITICAL ISSUE - ESM Module Parsing Failures  
**Impact**: Integration and E2E tests cannot run  

---

## 🚨 **Current Issue**

Jest cannot parse ESM modules from `koa-session` and `uuid`, causing test failures:

```
SyntaxError: Unexpected token 'export'
/Users/jooniekwun/Documents/DelayGuard/delayguard-app/node_modules/koa-session/node_modules/uuid/dist/esm-browser/index.js:1
export { default as v1 } from './v1.js';
^^^^^^
```

---

## 🔍 **Root Cause Analysis**

### **Problem**
- Jest is trying to parse ESM modules in CommonJS context
- `koa-session` depends on `uuid` which has ESM-only exports
- Current Jest configuration doesn't properly transform these modules

### **Affected Files**
- `tests/integration/workflow.test.ts`
- `tests/integration/analytics-integration.test.ts`
- `tests/e2e/analytics-dashboard-flow.test.ts`
- Any test that imports `src/server.ts`

---

## 🛠️ **Solution Steps**

### **Step 1: Update Jest Configuration**

Update `jest.config.ts`:

```typescript
// Add to transformIgnorePatterns
transformIgnorePatterns: [
  'node_modules/(?!(koa-session|uuid|msgpackr|bullmq|ioredis|@babel)/)'
],

// Add moduleNameMapper for ESM modules
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
  '^uuid$': '<rootDir>/node_modules/uuid/dist/index.js'
}
```

### **Step 2: Add Babel Configuration**

Create `.babelrc`:

```json
{
  "presets": [
    ["@babel/preset-env", {
      "targets": {
        "node": "current"
      },
      "modules": "commonjs"
    }]
  ]
}
```

### **Step 3: Update Package.json Scripts**

Add ESM support:

```json
{
  "scripts": {
    "test:esm": "NODE_OPTIONS='--experimental-vm-modules' jest",
    "test:ci": "NODE_OPTIONS='--experimental-vm-modules' jest --ci --coverage --watchAll=false"
  }
}
```

### **Step 4: Alternative - Mock Problematic Modules**

Create `__mocks__/koa-session.js`:

```javascript
module.exports = {
  default: () => (ctx, next) => next()
};
```

---

## 🧪 **Testing the Fix**

### **Run Integration Tests**
```bash
cd delayguard-app
npm run test:integration
```

### **Run E2E Tests**
```bash
cd delayguard-app
npm run test:e2e
```

### **Check ESM Module Loading**
```bash
cd delayguard-app
node -e "console.log(require('koa-session'))"
```

---

## 📊 **Expected Results**

After fixing:
- ✅ Integration tests should run without ESM errors
- ✅ E2E tests should run without ESM errors
- ✅ All 170 tests should be able to run
- ✅ Test coverage collection should work properly

---

## 🔄 **Fallback Options**

If ESM parsing continues to fail:

1. **Mock the problematic modules** in test files
2. **Use CommonJS versions** of dependencies where possible
3. **Split integration tests** to avoid ESM dependencies
4. **Use separate test environment** for ESM modules

---

## 📝 **Notes**

- This is a common issue with Jest and ESM modules
- The solution involves proper Jest configuration for ESM support
- May require updating Jest to latest version for better ESM support
- Consider using Vitest as alternative test runner if issues persist
