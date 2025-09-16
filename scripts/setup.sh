#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check command existence
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Header
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Workbench UI Setup Script${NC}"
echo -e "${BLUE}================================${NC}"
echo

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
else
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version)
    print_success "Python found: $PYTHON_VERSION"
else
    print_error "Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

# Check Git
if command_exists git; then
    GIT_VERSION=$(git --version)
    print_success "Git found: $GIT_VERSION"
else
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

# Create necessary directories
print_status "Creating directory structure..."
mkdir -p src/app
mkdir -p src/components
mkdir -p src/lib
mkdir -p src/hooks
mkdir -p src/types
mkdir -p src/utils
mkdir -p src/styles
mkdir -p src/config
mkdir -p public
mkdir -p scripts
mkdir -p docs
mkdir -p examples/mcp-client
mkdir -p examples/sophia-scripts
mkdir -p examples/cursor-workflows

print_success "Directory structure created"

# Check for .env.local
if [ ! -f .env.local ]; then
    if [ -f .env.example ]; then
        print_status "Creating .env.local from .env.example..."
        cp .env.example .env.local
    else
        print_status "Creating empty .env.local file..."
        touch .env.local
    fi
    cat >> .env.local << 'EOF'

# --- Local development overrides ---
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
ALLOW_DEV_WRITES=true
ALLOW_DEV_NOAUTH=true
ADMIN_USERNAME=ceo
ADMIN_PASSWORD=devpassword2025
ADMIN_WRITE_TOKEN=dev-admin-token-2025
ENABLE_PORTKEY=false
RESTRICT_MCP_PROXY=false
TESTING=false
NEXT_TELEMETRY_DISABLED=1
EOF
    print_warning ".env.local created - Review the Local development overrides section and add real API keys above it"
else
    print_success ".env.local already exists"
fi

# Install Node dependencies
print_status "Installing Node.js dependencies..."
if [ -f package.json ]; then
    npm install
    print_success "Node.js dependencies installed"
else
    print_error "package.json not found. Please ensure you're in the workbench-ui directory."
    exit 1
fi

# Check Python dependencies for MCP
print_status "Checking Python dependencies for MCP servers..."
SOPHIA_PATH="../sophia-intel-ai"
if [ -d "$SOPHIA_PATH" ]; then
    if [ -f "$SOPHIA_PATH/requirements.txt" ]; then
        print_status "Installing Python dependencies..."
        pip3 install -r "$SOPHIA_PATH/requirements.txt" --quiet
        print_success "Python dependencies installed"
    else
        print_warning "requirements.txt not found in sophia-intel-ai"
    fi
else
    print_warning "sophia-intel-ai directory not found at $SOPHIA_PATH"
    print_warning "MCP servers may not work without sophia-intel-ai backend"
fi

# Removed Sophia CLI installation and checks

# Create basic Next.js files if they don't exist
print_status "Creating basic application files..."

# Create next.config.js if it doesn't exist
if [ ! -f next.config.js ]; then
    cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  env: {
    MCP_MEMORY_PORT: process.env.MCP_MEMORY_PORT || '8081',
    MCP_FILESYSTEM_PORT: process.env.MCP_FILESYSTEM_PORT || '8082',
    MCP_ANALYTICS_PORT: process.env.MCP_ANALYTICS_PORT || '8083',
    MCP_GIT_PORT: process.env.MCP_GIT_PORT || '8084',
    MCP_UNIFIED_PORT: process.env.MCP_UNIFIED_PORT || '8085',
  },
}

module.exports = nextConfig
EOF
    print_success "next.config.js created"
fi

# Create tailwind.config.js if it doesn't exist
if [ ! -f tailwind.config.js ]; then
    cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF
    print_success "tailwind.config.js created"
fi

# Create postcss.config.js if it doesn't exist
if [ ! -f postcss.config.js ]; then
    cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
    print_success "postcss.config.js created"
fi

# Check MCP server connectivity
print_status "Checking MCP server connectivity..."
check_mcp_server() {
    local port=$1
    local name=$2
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/health" | grep -q "200\|404"; then
        print_success "$name server is accessible on port $port"
        return 0
    else
        print_warning "$name server is not running on port $port"
        return 1
    fi
}

MCP_RUNNING=false
if check_mcp_server 8081 "Memory"; then MCP_RUNNING=true; fi
if check_mcp_server 8082 "Filesystem"; then MCP_RUNNING=true; fi
if check_mcp_server 8083 "Analytics"; then MCP_RUNNING=true; fi
if check_mcp_server 8084 "Git"; then MCP_RUNNING=true; fi
if check_mcp_server 8085 "Unified"; then MCP_RUNNING=true; fi

if [ "$MCP_RUNNING" = false ]; then
    print_warning "No MCP servers are running. Start them with: cd $SOPHIA_PATH && ./startup.sh"
fi

# Create startup helper script
print_status "Creating startup helper script..."
cat > start-dev.sh << 'EOF'
#!/bin/bash
# Workbench UI Development Starter

echo "Starting Workbench UI development environment..."

# Function to check if port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
}

# Check if MCP servers are running
if ! check_port 8081; then
    echo "MCP servers not detected. Please start them first:"
    echo "  cd ../sophia-intel-ai && ./startup.sh"
    echo ""
fi

# Start Next.js development server
echo "Starting Next.js development server on http://localhost:3000"
npm run dev
EOF
chmod +x start-dev.sh
print_success "start-dev.sh created"

# Summary
echo
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}    Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo

print_status "Next steps:"
echo "  1. Add your API keys to .env.local"
echo "  2. Start MCP servers: cd $SOPHIA_PATH && ./startup.sh"
echo "  3. Start development: ./start-dev.sh or npm run dev"
echo "  4. Open http://localhost:3000 in your browser"
echo

if [ "$MCP_RUNNING" = false ]; then
    print_warning "Remember to start MCP servers before development!"
fi

print_success "Setup complete! Happy coding! 🚀"
