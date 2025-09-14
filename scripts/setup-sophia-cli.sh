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

# Header
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Sophia CLI Setup Script${NC}"
echo -e "${BLUE}================================${NC}"
echo

# Check if sophia-intel-ai exists
SOPHIA_PATH="../sophia-intel-ai"
if [ ! -d "$SOPHIA_PATH" ]; then
    print_error "sophia-intel-ai directory not found at $SOPHIA_PATH"
    print_status "Please ensure sophia-intel-ai is cloned next to workbench-ui"
    exit 1
fi

# Function to check command existence
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Python
if command_exists python3; then
    PYTHON_CMD="python3"
elif command_exists python; then
    PYTHON_CMD="python"
else
    print_error "Python is not installed. Please install Python 3.11+ first."
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
print_success "Python found: $PYTHON_VERSION"

# Install Sophia CLI
print_status "Installing Sophia CLI..."
cd "$SOPHIA_PATH"
$PYTHON_CMD -m pip install -e . --quiet --user
cd - > /dev/null

# Check if sophia is in PATH
if command_exists sophia; then
    print_success "Sophia CLI is available in PATH"
else
    print_warning "Sophia CLI installed but not in PATH"
    print_status "Adding ~/.local/bin to PATH..."
    
    # Detect shell and update appropriate config
    if [ -n "$ZSH_VERSION" ]; then
        SHELL_CONFIG="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
        SHELL_CONFIG="$HOME/.bashrc"
    else
        SHELL_CONFIG="$HOME/.profile"
    fi
    
    # Add to PATH if not already there
    if ! grep -q 'export PATH="$HOME/.local/bin:$PATH"' "$SHELL_CONFIG"; then
        echo '' >> "$SHELL_CONFIG"
        echo '# Sophia CLI' >> "$SHELL_CONFIG"
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_CONFIG"
        print_success "Added ~/.local/bin to PATH in $SHELL_CONFIG"
        print_warning "Please run: source $SHELL_CONFIG"
    else
        print_success "PATH already configured"
    fi
    
    # Update current session
    export PATH="$HOME/.local/bin:$PATH"
fi

# Configure Sophia CLI
print_status "Configuring Sophia CLI..."

# Check for environment variables
if [ -f .env.local ]; then
    print_status "Loading environment variables from .env.local..."
    export $(grep -v '^#' .env.local | xargs)
fi

# Function to safely set config
set_sophia_config() {
    local key=$1
    local value=$2
    local env_var=$3
    
    if [ -n "$value" ] && [ "$value" != "your_${env_var,,}_here" ] && [ "$value" != "${env_var}" ]; then
        sophia config set "$key" "$value" 2>/dev/null || true
        print_success "Set $key"
    else
        print_warning "$env_var not set in .env.local - please add it manually"
    fi
}

# Set API keys from environment
set_sophia_config "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY" "ANTHROPIC_API_KEY"
set_sophia_config "OPENAI_API_KEY" "$OPENAI_API_KEY" "OPENAI_API_KEY"
set_sophia_config "PORTKEY_API_KEY" "$PORTKEY_API_KEY" "PORTKEY_API_KEY"

# Set MCP server URLs
print_status "Configuring MCP server endpoints..."
sophia config set MCP_MEMORY_URL "http://localhost:${MCP_MEMORY_PORT:-8081}" 2>/dev/null || true
sophia config set MCP_FILESYSTEM_URL "http://localhost:${MCP_FILESYSTEM_PORT:-8082}" 2>/dev/null || true
sophia config set MCP_ANALYTICS_URL "http://localhost:${MCP_ANALYTICS_PORT:-8083}" 2>/dev/null || true
sophia config set MCP_GIT_URL "http://localhost:${MCP_GIT_PORT:-8084}" 2>/dev/null || true
sophia config set MCP_UNIFIED_URL "http://localhost:${MCP_UNIFIED_PORT:-8085}" 2>/dev/null || true
print_success "MCP endpoints configured"

# Set default model preferences
print_status "Setting default model preferences..."
sophia config set DEFAULT_MODEL "claude-3-5-sonnet-20241022" 2>/dev/null || true
sophia config set FALLBACK_MODEL "gpt-4-turbo-preview" 2>/dev/null || true
print_success "Model preferences set"

# Test Sophia CLI
print_status "Testing Sophia CLI..."
if sophia --version > /dev/null 2>&1; then
    VERSION=$(sophia --version 2>/dev/null || echo "unknown")
    print_success "Sophia CLI is working! Version: $VERSION"
else
    print_warning "Could not verify Sophia CLI. You may need to restart your terminal."
fi

# Create helper aliases
print_status "Creating helper aliases..."
cat > sophia-aliases.sh << 'EOF'
#!/bin/bash
# Sophia CLI aliases for common tasks

# Quick chat
alias sc='sophia chat'

# Generate code
alias scode='sophia code'

# Create plan
alias splan='sophia plan'

# MCP operations
alias smcp='sophia mcp'

# Store context
smcp-store() {
    sophia mcp store --key "$1" --value "$2"
}

# Retrieve context
smcp-get() {
    sophia mcp get --key "$1"
}

# Search context
smcp-search() {
    sophia mcp search --query "$1"
}

# Quick model switch
alias sc-gpt='sophia chat --model gpt-4'
alias sc-claude='sophia chat --model claude-3-5-sonnet-20241022'
alias sc-fast='sophia chat --model claude-3-haiku-20240307'

echo "Sophia CLI aliases loaded! Try 'sc \"Hello\"' for a quick chat."
EOF

print_success "Created sophia-aliases.sh"
print_status "To use aliases, run: source scripts/sophia-aliases.sh"

# Create example scripts
print_status "Creating example scripts..."
mkdir -p examples/sophia-scripts

cat > examples/sophia-scripts/component-generator.sh << 'EOF'
#!/bin/bash
# Generate a React component with Sophia CLI

COMPONENT_NAME=$1
if [ -z "$COMPONENT_NAME" ]; then
    echo "Usage: $0 ComponentName"
    exit 1
fi

sophia code "Create a TypeScript React functional component named $COMPONENT_NAME with:
- Props interface
- Default props
- Error boundary
- Loading state
- Basic styling with Tailwind
- Unit tests with Jest
Save to src/components/$COMPONENT_NAME/"
EOF
chmod +x examples/sophia-scripts/component-generator.sh

cat > examples/sophia-scripts/api-endpoint.sh << 'EOF'
#!/bin/bash
# Generate an API endpoint with Sophia CLI

ENDPOINT_NAME=$1
METHOD=${2:-GET}

if [ -z "$ENDPOINT_NAME" ]; then
    echo "Usage: $0 endpoint-name [METHOD]"
    exit 1
fi

sophia code "Create a Next.js API route for $METHOD /api/$ENDPOINT_NAME with:
- TypeScript types
- Input validation with Zod
- Error handling
- Rate limiting
- Response caching
- OpenAPI documentation
Save to src/app/api/$ENDPOINT_NAME/route.ts"
EOF
chmod +x examples/sophia-scripts/api-endpoint.sh

print_success "Example scripts created in examples/sophia-scripts/"

# Summary
echo
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Sophia CLI Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo

print_status "Quick start commands:"
echo "  sophia chat \"How do I create a dashboard?\""
echo "  sophia code \"Generate a user authentication hook\""
echo "  sophia plan \"Design a real-time notification system\""
echo ""
print_status "With MCP:"
echo "  sophia mcp store --key context --value \"Building dashboard\""
echo "  sophia mcp search --query \"dashboard\""
echo ""
print_status "Load aliases for shortcuts:"
echo "  source scripts/sophia-aliases.sh"
echo ""

# Check for missing API keys
if [ "$ANTHROPIC_API_KEY" = "your_anthropic_key_here" ] || [ -z "$ANTHROPIC_API_KEY" ]; then
    print_warning "Remember to add your ANTHROPIC_API_KEY to .env.local"
fi
if [ "$OPENAI_API_KEY" = "your_openai_key_here" ] || [ -z "$OPENAI_API_KEY" ]; then
    print_warning "Remember to add your OPENAI_API_KEY to .env.local"
fi
if [ "$PORTKEY_API_KEY" = "your_portkey_key_here" ] || [ -z "$PORTKEY_API_KEY" ]; then
    print_warning "Remember to add your PORTKEY_API_KEY to .env.local"
fi

print_success "Setup complete! Happy coding with Sophia! 🚀"