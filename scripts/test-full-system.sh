#!/bin/bash
# Full System Integration Test for MCP Servers
# Tests both sophia-intel-ai backend and workbench-ui frontend

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Full System MCP Integration Test${NC}"
echo -e "${BLUE}================================================${NC}\n"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from workbench-ui directory${NC}"
    exit 1
fi

WORKBENCH_DIR=$(pwd)
SOPHIA_DIR="/Users/lynnmusil/sophia-intel-ai"

# Step 1: Check Backend MCP Servers
echo -e "${YELLOW}1. Testing Backend MCP Servers...${NC}"
if [ -d "$SOPHIA_DIR" ]; then
    cd "$SOPHIA_DIR"
    
    # Quick health check
    echo "   Running quick health check..."
    if command -v python3 &> /dev/null; then
        python3 scripts/validate_mcp_servers_enhanced.py --quick --allow-vector-skip || true
    else
        echo -e "${RED}   Python3 not found${NC}"
    fi
    
    cd "$WORKBENCH_DIR"
else
    echo -e "${RED}   sophia-intel-ai directory not found${NC}"
fi

# Step 2: (removed) Sophia CLI status check

# Step 3: Test Workbench UI MCP Integration
echo -e "\n${YELLOW}3. Testing Workbench UI MCP Integration...${NC}"

# Check if servers are running
test_server() {
    local port=$1
    local name=$2
    
    if curl -s -H "Authorization: Bearer dev-token" \
         http://localhost:$port/health > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ $name Server (port $port): Running${NC}"
        return 0
    else
        echo -e "   ${RED}❌ $name Server (port $port): Not running${NC}"
        return 1
    fi
}

echo "   Checking MCP servers..."
test_server 8081 "Memory"
test_server 8082 "Filesystem"
test_server 8084 "Git"
test_server 8085 "Vector"

# Step 4: Test API Routes (if dev server is running)
echo -e "\n${YELLOW}4. Testing API Routes...${NC}"
if curl -s http://localhost:3201 > /dev/null 2>&1; then
    echo "   Testing /api/mcp/health..."
    HEALTH_RESPONSE=$(curl -s http://localhost:3201/api/mcp/health 2>/dev/null || echo "{}")
    if echo "$HEALTH_RESPONSE" | grep -q "status"; then
        echo -e "   ${GREEN}✅ Health API working${NC}"
        echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null | head -20 || true
    else
        echo -e "   ${YELLOW}⚠️ Health API not responding${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️ Workbench UI dev server not running on port 3201${NC}"
    echo "   Run 'npm run dev' to start the server"
fi

# Step 5: Test Direct MCP Endpoints
echo -e "\n${YELLOW}5. Testing Direct MCP Endpoints...${NC}"

# Memory server test
echo "   Testing Memory server endpoints..."
if curl -s -X POST http://localhost:8081/search \
     -H "Authorization: Bearer dev-token" \
     -H "Content-Type: application/json" \
     -d '{"query":"test"}' > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Memory search endpoint working${NC}"
else
    echo -e "   ${YELLOW}⚠️ Memory search endpoint not responding${NC}"
fi

# Filesystem server test
echo "   Testing Filesystem server endpoints..."
if curl -s -X POST http://localhost:8082/fs/list \
     -H "Authorization: Bearer dev-token" \
     -H "Content-Type: application/json" \
     -d '{"path":"."}' > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Filesystem list endpoint working${NC}"
else
    echo -e "   ${YELLOW}⚠️ Filesystem list endpoint not responding${NC}"
fi

# Git server test
echo "   Testing Git server endpoints..."
if curl -s http://localhost:8084/status \
     -H "Authorization: Bearer dev-token" > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Git status endpoint working${NC}"
else
    echo -e "   ${YELLOW}⚠️ Git status endpoint not responding${NC}"
fi

# Vector server test
echo "   Testing Vector server endpoints..."
if curl -s http://localhost:8085/health \
     -H "Authorization: Bearer dev-token" > /dev/null 2>&1; then
    VECTOR_STATUS=$(curl -s http://localhost:8085/health -H "Authorization: Bearer dev-token" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$VECTOR_STATUS" = "healthy" ] || [ "$VECTOR_STATUS" = "degraded" ]; then
        echo -e "   ${GREEN}✅ Vector server responding (status: $VECTOR_STATUS)${NC}"
    else
        echo -e "   ${YELLOW}⚠️ Vector server unhealthy${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️ Vector server not responding${NC}"
fi

# Step 6: Summary
echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}================================================${NC}"

echo -e "\n${GREEN}Next Steps:${NC}"
echo "1. If servers are not running:"
echo "   cd $SOPHIA_DIR && ./startup_enhanced.sh"
echo ""
echo "2. To run full validation:"
echo "   cd $SOPHIA_DIR"
echo "   python3 scripts/validate_mcp_servers_enhanced.py -v -o report.json"
echo ""
echo "3. To start Workbench UI:"
echo "   cd $WORKBENCH_DIR"
echo "   npm run dev"
echo ""
# 4. (removed) Sophia CLI test instructions

echo -e "${GREEN}✅ Full system test complete!${NC}"
