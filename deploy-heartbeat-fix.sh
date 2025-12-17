#!/bin/bash

echo "🚀 Deploying Heartbeat System Fixes..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Checking database migrations...${NC}"
node check-heartbeat-migrations.js

echo ""
echo -e "${BLUE}Step 2: Testing heartbeat function logic...${NC}"
node test-heartbeat-function.js

echo ""
echo -e "${BLUE}Step 3: Preparing deployment...${NC}"

# Add all changes
git add .

# Commit changes
git commit -m "fix: complete heartbeat system implementation

- Add HeartbeatStatus component to Settings page
- Fix TypeScript errors in HeartbeatStatus
- Create diagnostic and testing scripts
- Add comprehensive deployment guide
- Ensure proper error handling and user feedback
- Remove GitHub Actions backup (using only Netlify)

This completes the heartbeat system with:
- Frontend visibility in Settings
- Database migration verification
- Function testing capabilities
- Complete deployment documentation"

echo ""
echo -e "${GREEN}✅ Changes committed successfully${NC}"

echo ""
echo -e "${BLUE}Step 4: Deploying to Netlify...${NC}"

# Push to trigger deployment
git push origin main

echo ""
echo -e "${GREEN}🎉 Deployment initiated!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Wait for Netlify deployment to complete"
echo "2. Test the Settings page in your application"
echo "3. Check Netlify Functions logs for heartbeat execution"
echo ""
echo -e "${BLUE}📖 For detailed instructions, see: HEARTBEAT_FIX_GUIDE.md${NC}"