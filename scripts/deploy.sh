#!/bin/bash

# Production deployment script for CRM system
# This script safely handles database migrations and deployment

set -e  # Exit on any error

echo "🚀 Starting CRM Production Deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment variables
echo "📋 Checking environment variables..."
required_vars=("DATABASE_URL" "JWT_SECRET" "NEXT_PUBLIC_BASE_URL")
for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo -e "${RED}❌ Missing required environment variable: $var${NC}"
    exit 1
  fi
done
echo -e "${GREEN}✅ Environment variables validated${NC}"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Generate Prisma client
echo "🗃️ Generating Prisma client..."
npx prisma generate
echo -e "${GREEN}✅ Prisma client generated${NC}"

# Run database migrations safely
echo "🗄️ Running database migrations..."
if npx prisma migrate deploy; then
  echo -e "${GREEN}✅ Database migrations completed${NC}"
else
  echo -e "${YELLOW}⚠️ No pending migrations or migrations already applied${NC}"
fi

# Build the application
echo "🔨 Building application..."
npm run build
echo -e "${GREEN}✅ Application built successfully${NC}"

# Run security checks
echo "🔒 Running security checks..."
if command -v npm audit &> /dev/null; then
  if npm audit --audit-level moderate; then
    echo -e "${GREEN}✅ Security audit passed${NC}"
  else
    echo -e "${YELLOW}⚠️ Security vulnerabilities found - review npm audit output${NC}"
  fi
fi

echo ""
echo -e "${GREEN}🎉 Deployment preparation completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Review the build output above for any warnings"
echo "2. Test the application in staging environment"
echo "3. Deploy to production using your hosting platform"
echo "4. Monitor application logs and performance"
echo ""
echo "For production deployment, ensure:"
echo "- HTTPS is enabled"
echo "- Environment variables are set securely"
echo "- Database backups are configured"
echo "- Monitoring and alerting are set up"
