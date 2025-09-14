#!/bin/bash

# Sync .env.master from sophia-intel-ai to workspace-ui
# This script replicates the master environment configuration
# while maintaining workspace-ui specific overrides

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_UI_ROOT="$(dirname "$SCRIPT_DIR")"
SOPHIA_ROOT="${SOPHIA_ROOT:-$HOME/sophia-intel-ai}"

echo "🔄 Syncing .env.master from sophia-intel-ai to workspace-ui..."

# Check if sophia-intel-ai exists
if [ ! -d "$SOPHIA_ROOT" ]; then
    echo "❌ Error: sophia-intel-ai directory not found at $SOPHIA_ROOT"
    echo "   Please set SOPHIA_ROOT environment variable or ensure sophia-intel-ai is at ~/sophia-intel-ai"
    exit 1
fi

# Check if .env.master exists in sophia-intel-ai
if [ ! -f "$SOPHIA_ROOT/.env.master" ]; then
    echo "❌ Error: .env.master not found in $SOPHIA_ROOT"
    exit 1
fi

# Create .env.master in workspace-ui if it doesn't exist
if [ ! -f "$WORKSPACE_UI_ROOT/.env.master" ]; then
    echo "📝 Creating .env.master in workspace-ui..."
    cp "$SOPHIA_ROOT/.env.master" "$WORKSPACE_UI_ROOT/.env.master"
else
    echo "🔍 Checking for updates..."
    
    # Check if files are different
    if ! diff -q "$SOPHIA_ROOT/.env.master" "$WORKSPACE_UI_ROOT/.env.master" > /dev/null 2>&1; then
        echo "📋 Backing up current .env.master..."
        cp "$WORKSPACE_UI_ROOT/.env.master" "$WORKSPACE_UI_ROOT/.env.master.backup.$(date +%Y%m%d_%H%M%S)"
        
        echo "📥 Syncing .env.master from sophia-intel-ai..."
        cp "$SOPHIA_ROOT/.env.master" "$WORKSPACE_UI_ROOT/.env.master"
        
        echo "✅ .env.master synced successfully"
    else
        echo "✅ .env.master is already up to date"
    fi
fi

# Create .env from .env.master if it doesn't exist
if [ ! -f "$WORKSPACE_UI_ROOT/.env" ]; then
    echo "📝 Creating .env from .env.master..."
    cp "$WORKSPACE_UI_ROOT/.env.master" "$WORKSPACE_UI_ROOT/.env"
    
    # Add workspace-ui specific configuration
    cat >> "$WORKSPACE_UI_ROOT/.env" << 'EOF'

# Workspace-UI Specific Configuration
WORKSPACE_UI_PORT=3201
WORKSPACE_UI_ENV=development
WORKSPACE_UI_API_URL=http://localhost:8000

# Agno Framework Configuration
AGNO_ENABLED=true
AGNO_DEBUG=true
AGNO_LOG_LEVEL=debug

# MCP Server Configuration (from sophia-intel-ai)
MCP_MEMORY_SERVER=http://localhost:8081
MCP_FILESYSTEM_SERVER=http://localhost:8082
MCP_GIT_SERVER=http://localhost:8084
MCP_VECTOR_SERVER=http://localhost:8085

# Portkey Virtual Keys for SDK usage
# Note: SDK requires "@" prefix, headers do not
ANTHROPIC_VK_B=@anthropic-vk-b
OPENAI_VK_C=@openai-vk-c
GOOGLE_VK_D=@google-vk-d
GROK_VK_E=@grok-vk-e
EOF
    
    echo "✅ .env created with workspace-ui specific configuration"
fi

# Update Pulumi ESC if available
if command -v pulumi &> /dev/null; then
    echo "🔐 Checking Pulumi ESC configuration..."
    
    # Check if Pulumi project is initialized
    if [ -f "$WORKSPACE_UI_ROOT/Pulumi.yaml" ]; then
        cd "$WORKSPACE_UI_ROOT"
        
        # Try to refresh ESC environment
        if pulumi env get sophia-intel-ai/workspace-ui &> /dev/null; then
            echo "✅ Pulumi ESC environment found"
            
            # Export environment variables to ESC
            echo "📤 Syncing secrets to Pulumi ESC..."
            
            # Read .env.master and export to ESC (only key secrets)
            if [ -f "$WORKSPACE_UI_ROOT/.env.master" ]; then
                # Extract and set Portkey API key
                PORTKEY_KEY=$(grep "^PORTKEY_API_KEY=" "$WORKSPACE_UI_ROOT/.env.master" | cut -d'=' -f2)
                if [ -n "$PORTKEY_KEY" ]; then
                    pulumi config set portkey:apiKey "$PORTKEY_KEY" --secret 2>/dev/null || true
                fi
                
                echo "✅ Secrets synced to Pulumi ESC"
            fi
        else
            echo "⚠️  Pulumi ESC environment not configured. Run 'pulumi env init sophia-intel-ai/workspace-ui' to set up"
        fi
    fi
else
    echo "ℹ️  Pulumi not installed. Skipping ESC sync"
fi

echo "
✨ Environment sync complete!

Next steps:
1. Review the .env file in workspace-ui
2. Run 'npm install' in workspace-ui directory
3. Start the development server with 'npm run dev'

To use with Pulumi ESC:
1. Install Pulumi: curl -fsSL https://get.pulumi.com | sh
2. Login: pulumi login
3. Initialize environment: pulumi env init sophia-intel-ai/workspace-ui
"