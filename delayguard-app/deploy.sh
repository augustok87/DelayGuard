#!/bin/bash

# DelayGuard Production Deployment Script
echo "🚀 Starting DelayGuard Production Deployment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Not logged in to Vercel. Please run 'vercel login' first."
    echo "   This will open a browser for authentication."
    exit 1
fi

# Run tests to ensure everything is working
echo "🧪 Running tests..."
npm test -- --testPathPattern="carrier-service|delay-detection|notification-service" --passWithNoTests

if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please fix issues before deploying."
    exit 1
fi

echo "✅ Tests passed!"

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix issues before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod --yes

if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Configure environment variables in Vercel dashboard"
    echo "2. Set up database and Redis instances"
    echo "3. Configure external API keys"
    echo "4. Test the deployment"
    echo "5. Submit to Shopify App Store"
    echo ""
    echo "📖 See DEPLOYMENT_GUIDE.md for detailed instructions"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi

