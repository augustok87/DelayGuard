# DelayGuard Development Guide

**Last Updated**: October 21, 2025

## 🚀 Quick Start

### Simple Development Mode (No Dependencies)

For frontend development without needing Redis/PostgreSQL:

```bash
cd delayguard-app
npm run dev
```

This starts:
- **Backend** on `http://localhost:3001` (simple mock server)
- **Frontend** on `http://localhost:3000` (webpack dev server with hot reload)

### Full Development Mode (With All Services)

If you have Redis and PostgreSQL running locally:

```bash
cd delayguard-app
npm run dev:full
```

This starts:
- **Backend** on `http://localhost:3000` (full server with all features)
- **Frontend** on `http://localhost:3000` (webpack dev server)

---

## 📋 Available Commands

### Development

```bash
# Simple dev mode (recommended for frontend work)
npm run dev

# Full dev mode (requires Redis + PostgreSQL)
npm run dev:full

# Backend only (simple)
npm run dev:server:simple

# Backend only (full)
npm run dev:server

# Frontend only
npm run dev:client
```

### Building

```bash
# Build everything
npm run build

# Build client only
npm run build:client

# Build server only
npm run build:server
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run type-check
```

---

## 🛠️ What's Different Between Modes?

### Simple Mode (`npm run dev`)

**Pros:**
- ✅ No external dependencies needed
- ✅ Quick startup
- ✅ Perfect for frontend development
- ✅ Mock API responses

**Cons:**
- ⚠️ No real database operations
- ⚠️ No real queue processing
- ⚠️ Mock data only

**Backend runs on**: `http://localhost:3001`  
**Frontend runs on**: `http://localhost:3000`

### Full Mode (`npm run dev:full`)

**Pros:**
- ✅ Full feature set
- ✅ Real database operations
- ✅ Real queue processing
- ✅ GDPR webhooks working
- ✅ Billing system active

**Cons:**
- ⚠️ Requires PostgreSQL running
- ⚠️ Requires Redis running
- ⚠️ Longer startup time
- ⚠️ Need external API keys

**Requirements:**
- PostgreSQL database
- Redis instance
- All environment variables set

---

## 🔧 Setting Up Full Mode (Optional)

If you want to test the complete system locally:

### 1. Install PostgreSQL

**Mac (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
createdb delayguard_dev
```

**Linux:**
```bash
sudo apt install postgresql
sudo systemctl start postgresql
sudo -u postgres createdb delayguard_dev
```

### 2. Install Redis

**Mac (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

### 3. Update .env File

```env
DATABASE_URL=postgresql://localhost:5432/delayguard_dev
REDIS_URL=redis://localhost:6379
```

### 4. Run Migrations

```bash
npm run db:migrate
```

### 5. Start Full Mode

```bash
npm run dev:full
```

---

## 🌐 Accessing Your App

### Frontend
**URL**: `http://localhost:3000`

**Features:**
- React app with hot reload
- Redux dev tools enabled
- All UI components working

### Backend (Simple Mode)
**URL**: `http://localhost:3001`

**Endpoints:**
- `GET /health` - Health check
- `GET /api/settings` - Mock settings
- `GET /api/alerts` - Mock alerts
- `GET /api/orders` - Mock orders
- `GET /api/stats` - Mock stats
- `POST /webhooks/gdpr/*` - Mock GDPR webhooks
- `GET /billing/*` - Mock billing endpoints

### Backend (Full Mode)
**URL**: `http://localhost:3000`

**Features:**
- All production features
- Real database operations
- Queue processing
- GDPR compliance
- Billing system

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### TypeScript Errors

```bash
# Clean and rebuild
rm -rf node_modules package-lock.json
npm install
npm run type-check
```

### Environment Variables Not Loading

```bash
# Check .env file exists
ls -la .env

# Verify contents
cat .env

# Make sure NODE_ENV is set to development
echo $NODE_ENV
```

### Database Connection Fails (Full Mode)

```bash
# Check if PostgreSQL is running
pg_isready

# Test connection
psql -d delayguard_dev

# Reset database
dropdb delayguard_dev && createdb delayguard_dev
npm run db:migrate
```

### Redis Connection Fails (Full Mode)

```bash
# Check if Redis is running
redis-cli ping
# Should respond: PONG

# Start Redis
brew services start redis  # Mac
sudo systemctl start redis # Linux
```

---

## 📝 Files Modified

Recent changes to enable simple dev mode:

- ✅ `src/config/app-config.ts` - Centralized config (NEW)
- ✅ `src/server-simple.ts` - Simple dev server (NEW)
- ✅ `src/routes/api.ts` - Fixed config import
- ✅ `src/routes/monitoring.ts` - Fixed config import
- ✅ `src/server.ts` - Uses centralized config
- ✅ `src/hooks/useAsyncResource.ts` - Fixed error handling
- ✅ `package.json` - Added dev commands
- ✅ `.env` - Development-friendly defaults

---

## 🎯 Recommended Workflow

### For Frontend Development

1. Use simple mode: `npm run dev`
2. Work on React components
3. Use mock API responses
4. Hot reload works automatically

### For Backend Development

1. Set up PostgreSQL and Redis
2. Use full mode: `npm run dev:full`
3. Test real API endpoints
4. Test database operations

### For Full Integration Testing

1. Ensure all services running
2. Use full mode: `npm run dev:full`
3. Test complete workflows
4. Test GDPR and billing features

---

## ✅ Next Steps

Now that your dev environment works:

1. **Frontend Development** - Work on React components
2. **Add Features** - Implement new functionality
3. **Write Tests** - Maintain 99.8% test success
4. **Prepare for Production** - Follow PRODUCTION_SETUP.md

---

## 📚 Related Documentation

- `PRODUCTION_SETUP.md` - Production deployment guide
- `SHOPIFY_SUBMISSION_CHECKLIST.md` - App store submission
- `IMPLEMENTATION_SUMMARY.md` - Recent implementation details
- `README.md` - Project overview

---

**Happy Coding!** 🚀

If you encounter any issues, check the troubleshooting section above or review the logs in the terminal.

