#!/bin/bash

# GitHub Access Setup Script
# Simplified approach to get you working immediately

echo "🚀 GitHub Access Quick Setup for ai-cherry"
echo "=========================================="
echo ""
echo "This script will help you set up GitHub access quickly."
echo "We'll use a Personal Access Token for immediate functionality."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}Creating .env.local file...${NC}"
    cp .env.example .env.local
fi

echo "📝 Step 1: Create a GitHub Personal Access Token"
echo "------------------------------------------------"
echo ""
echo "1. Open this URL in your browser:"
echo "   https://github.com/settings/tokens/new"
echo ""
echo "2. Configure your token:"
echo "   - Note: 'AI Cherry Workbench Access'"
echo "   - Expiration: 90 days (or 'No expiration' for development)"
echo "   - Select scopes:"
echo "     ✅ repo (Full control of private repositories)"
echo "     ✅ workflow (Update GitHub Action workflows)"
echo "     ✅ write:packages (Upload packages to GitHub Package Registry)"
echo "     ✅ admin:org (Full control of orgs and teams, read and write org projects)"
echo "     ✅ admin:repo_hook (Full control of repository hooks)"
echo "     ✅ gist (Create gists)"
echo ""
echo "3. Click 'Generate token'"
echo "4. COPY THE TOKEN NOW (you won't see it again!)"
echo ""

read -p "Paste your GitHub Personal Access Token here: " github_token

if [ -z "$github_token" ]; then
    echo -e "${RED}Error: No token provided${NC}"
    exit 1
fi

# Update .env.local with the token
echo -e "${GREEN}Updating .env.local with your GitHub token...${NC}"
sed -i.bak "s|GITHUB_PERSONAL_ACCESS_TOKEN=.*|GITHUB_PERSONAL_ACCESS_TOKEN=$github_token|" .env.local

echo ""
echo "📝 Step 2: Configure Additional API Keys (Optional)"
echo "---------------------------------------------------"
echo "Do you want to set up additional API keys now? (y/n)"
read -p "Your choice: " setup_more

if [ "$setup_more" = "y" ] || [ "$setup_more" = "Y" ]; then
    echo ""
    echo "Leave blank to skip any service:"
    echo ""
    
    read -p "Anthropic API Key (from https://console.anthropic.com/): " anthropic_key
    if [ ! -z "$anthropic_key" ]; then
        sed -i.bak "s|ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$anthropic_key|" .env.local
    fi
    
    read -p "OpenAI API Key (from https://platform.openai.com/api-keys): " openai_key
    if [ ! -z "$openai_key" ]; then
        sed -i.bak "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$openai_key|" .env.local
    fi
    
    read -p "Portkey API Key (from https://app.portkey.ai/): " portkey_key
    if [ ! -z "$portkey_key" ]; then
        sed -i.bak "s|PORTKEY_API_KEY=.*|PORTKEY_API_KEY=$portkey_key|" .env.local
    fi
fi

echo ""
echo "🔧 Step 3: Testing GitHub Connection"
echo "------------------------------------"

# Export the token for testing
export GITHUB_PERSONAL_ACCESS_TOKEN=$github_token

# Test the connection
echo "Testing GitHub API connection..."
response=$(curl -s -H "Authorization: token $github_token" https://api.github.com/user)

if echo "$response" | grep -q '"login"'; then
    username=$(echo "$response" | grep -o '"login":"[^"]*' | sed 's/"login":"//')
    echo -e "${GREEN}✅ Success! Authenticated as: $username${NC}"
    
    # Update username in .env.local
    sed -i.bak "s|GITHUB_USERNAME=.*|GITHUB_USERNAME=$username|" .env.local
else
    echo -e "${RED}❌ Failed to authenticate with GitHub${NC}"
    echo "Response: $response"
    echo ""
    echo "Please check your token and try again."
    exit 1
fi

echo ""
echo "🚀 Step 4: Quick Start Commands"
echo "-------------------------------"
echo ""
echo "Your system is now configured! Here are useful commands:"
echo ""
echo "  # Start the development server"
echo "  npm run dev"
echo ""
echo "  # Test MCP servers"
echo "  npm run mcp:connect"
echo ""
echo "  # Run the full system test"
echo "  ./scripts/test-full-system.sh"
echo ""

echo "📋 Step 5: Verify MCP Server Access"
echo "-----------------------------------"
echo ""
echo "Testing MCP GitHub server..."

# Create a test script for MCP
cat > test-mcp-github.js << 'EOF'
const { spawn } = require('child_process');

const githubServer = spawn('docker', [
  'run', '-i', '--rm',
  '-e', `GITHUB_PERSONAL_ACCESS_TOKEN=${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
  'ghcr.io/github/github-mcp-server'
]);

let output = '';
githubServer.stdout.on('data', (data) => {
  output += data.toString();
});

githubServer.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

// Send a test request
setTimeout(() => {
  githubServer.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    method: "tools/list",
    id: 1
  }) + '\n');
}, 1000);

setTimeout(() => {
  if (output.includes('"result"')) {
    console.log('✅ MCP GitHub server is working!');
  } else {
    console.log('⚠️  MCP GitHub server needs Docker. Install Docker Desktop if not present.');
  }
  githubServer.kill();
  process.exit(0);
}, 3000);
EOF

node test-mcp-github.js
rm test-mcp-github.js

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Important files:"
echo "  - .env.local (your credentials - DO NOT COMMIT)"
echo "  - .roo/mcp.json (MCP server configuration)"
echo "  - docs/GITHUB_APP_SETUP_GUIDE.md (for production setup)"
echo ""
echo "Security reminders:"
echo "  1. Never commit .env.local to git"
echo "  2. Rotate your token every 90 days"
echo "  3. Use GitHub App for production (see guide)"
echo ""
echo "Need help? Check:"
echo "  - README.md for project overview"
echo "  - QUICK_START.md for usage instructions"
echo "  - docs/GITHUB_APP_SETUP_GUIDE.md for production setup"
echo ""

# Clean up backup files
rm -f .env.local.bak

echo "Happy coding! 🎉"