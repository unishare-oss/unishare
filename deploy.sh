#!/bin/bash
# Oracle Server Deployment Script
# Usage: ./deploy.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting UniShare Deployment...${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create .env file with required variables:"
    echo "  DB_USER, DB_PASSWORD, DB_NAME"
    echo "  BETTER_AUTH_SECRET, BETTER_AUTH_URL, FRONTEND_URL"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '#' | xargs)

echo -e "${YELLOW}Pulling latest API image...${NC}"
docker pull ghcr.io/unishare-oss/unishare-api:latest

echo -e "${YELLOW}Stopping existing services...${NC}"
docker compose down api || true

echo -e "${YELLOW}Starting services...${NC}"
docker compose up -d api

echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Check API health
echo -e "${YELLOW}Checking API health...${NC}"
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}API is healthy!${NC}"
else
    echo -e "${RED}API health check failed!${NC}"
    echo "Recent logs:"
    docker compose logs api | tail -30
    exit 1
fi

# Check database connection
echo -e "${YELLOW}Checking database...${NC}"
if docker compose exec -T postgres pg_isready -U ${DB_USER:-postgres} > /dev/null 2>&1; then
    echo -e "${GREEN}Database is healthy!${NC}"
else
    echo -e "${RED}Database health check failed!${NC}"
    exit 1
fi

echo -e "${GREEN}Deployment successful!${NC}"
echo ""
echo "Service Status:"
docker compose ps

echo ""
echo -e "${GREEN}Resource Usage:${NC}"
docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.CPUPerc}}"

echo ""
echo "View logs:"
echo "  docker compose logs -f api"
echo "  docker compose logs -f postgres"
