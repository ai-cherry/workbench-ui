# Workbench UI Setup Guide
## Complete Setup Instructions for Cursor, Cline, and Sophia CLI Integration

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/ai-cherry/workbench-ui.git
cd workbench-ui

# Run the automated setup
./scripts/setup.sh

# Start development
npm run dev
```

---

## 📋 Prerequisites

### Required Software
- **Node.js** 18.0+ (LTS recommended)
- **Python** 3.11+ (for MCP servers)
- **Git** 2.30+
- **Cursor** (latest version)
- **VS Code** (with Cline extension)

### Environment Variables
Create a `.env.local` file in the root directory:

```env
# API Keys (Required)
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
PORTKEY_API_KEY=your_portkey_key

# MCP Server Configuration
MCP_MEMORY_PORT=8081
MCP_FILESYSTEM_PORT=8082
MCP_ANALYTICS_PORT=8083
MCP_GIT_PORT=8084
MCP_UNIFIED_PORT=8085

# Backend Integration
SOPHIA_BACKEND_PATH=../sophia-intel-ai
SOPHIA_API_URL=http://localhost:8000

# Frontend Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🔧 Manual Setup Steps

### 1. Install Dependencies

```bash
# Install Node dependencies
npm install

# Install Python dependencies for MCP servers
pip install -r ../sophia-intel-ai/requirements.txt
```

### 2. Configure Cursor for MCP

The `.cursor/settings.json` is pre-configured. To activate:

1. Open workbench-ui in Cursor
2. Go to Settings → MCP → Enable MCP Integration
3. Restart Cursor to load MCP servers

### 3. Configure Cline for MCP

The `.cline/mcp_settings.json` is pre-configured. To activate:

1. Open VS Code with Cline extension
2. Go to Cline Settings → MCP Configuration
3. Click "Load from File" and select `.cline/mcp_settings.json`
4. Restart VS Code

### 4. Setup Sophia CLI

```bash
# Navigate to sophia-intel-ai
cd ../sophia-intel-ai

# Install Sophia CLI globally
pip install -e .

# Verify installation
sophia --version

# Configure API keys
sophia config set ANTHROPIC_API_KEY "your_key"
sophia config set OPENAI_API_KEY "your_key"
sophia config set PORTKEY_API_KEY "your_key"

# Test the CLI
sophia chat "Hello, test connection"
```

---

## 🤖 MCP Server Architecture

### Available MCP Servers

| Server | Port | Purpose | Status Endpoint |
|--------|------|---------|-----------------|
| Memory | 8081 | Context storage & retrieval | http://localhost:8081/health |
| Filesystem | 8082 | File operations with safety | http://localhost:8082/health |
| Analytics | 8083 | Usage tracking & metrics | http://localhost:8083/health |
| Git | 8084 | Repository operations | http://localhost:8084/health |
| Unified | 8085 | Orchestrator for all servers | http://localhost:8085/health |

### Starting MCP Servers

```bash
# Start all MCP servers (from sophia-intel-ai)
cd ../sophia-intel-ai
./startup.sh

# Or start individually
python mcp/memory_server.py &
python mcp/filesystem/server.py &
python mcp/analytics/server.py &
python mcp/git/server.py &
python mcp/unified/server.py &
```

### Verifying MCP Connection

```bash
# Check all servers health
curl http://localhost:8081/health
curl http://localhost:8082/health
curl http://localhost:8083/health
curl http://localhost:8084/health
curl http://localhost:8085/health

# Test memory server
curl -X POST http://localhost:8081/store \
  -H "Content-Type: application/json" \
  -d '{"key": "test", "value": "Hello MCP"}'

# Test filesystem server
curl -X POST http://localhost:8082/read \
  -H "Content-Type: application/json" \
  -d '{"path": "./package.json"}'
```

---

## 💻 Sophia CLI Usage

### Basic Commands

```bash
# Interactive chat
sophia chat "Explain the MCP architecture"

# Generate a plan
sophia plan "Create a dashboard component"

# Generate code
sophia code "Write a React hook for MCP connection"

# Apply changes
sophia apply changes.diff

# Use specific model
sophia chat --model gpt-4 "Your prompt"

# Stream response
sophia chat --stream "Long technical explanation"
```

### Advanced Features

```bash
# Use with context file
sophia chat --context ./docs/requirements.md "Implement this feature"

# Save conversation
sophia chat --save conversation.json "Discussion topic"

# Load previous conversation
sophia chat --load conversation.json "Continue from here"

# Use custom temperature
sophia chat --temperature 0.3 "Precise technical answer"

# Set max tokens
sophia chat --max-tokens 2000 "Detailed explanation"
```

### MCP Integration with CLI

```bash
# Store context in MCP
sophia mcp store --key "project_context" --value "Dashboard project"

# Retrieve from MCP
sophia mcp get --key "project_context"

# Search MCP memories
sophia mcp search --query "dashboard"

# List all stored contexts
sophia mcp list
```

---

## 🛠️ Development Workflow

### 1. Start Development Environment

```bash
# Terminal 1: Start MCP servers
cd ../sophia-intel-ai
./startup.sh

# Terminal 2: Start Sophia backend
cd ../sophia-intel-ai
./dev api

# Terminal 3: Start workbench-ui
cd workbench-ui
npm run dev
```

### 2. Using Cursor with MCP

1. Open Cursor in workbench-ui directory
2. Use Cmd+K for AI assistance
3. MCP servers provide context automatically
4. Use `@workspace` to reference entire codebase
5. Use `@file` to reference specific files

### 3. Using Cline with MCP

1. Open VS Code in workbench-ui directory
2. Open Cline panel (Cmd+Shift+P → "Cline: Open")
3. MCP integration provides automatic context
4. Use `/mcp` prefix for MCP-specific commands

### 4. Using Sophia CLI

```bash
# For quick code generation
sophia code "Create a TypeScript interface for user data"

# For architecture decisions
sophia plan "Design a scalable component structure"

# For debugging
sophia chat "Why is this React hook causing re-renders?"
```

---

## 🔍 Troubleshooting

### MCP Servers Not Starting

```bash
# Check Python path
which python
python --version  # Should be 3.11+

# Check PYTHONPATH
export PYTHONPATH="../sophia-intel-ai:$PYTHONPATH"

# Check port availability
lsof -i :8081-8085

# Kill existing processes
pkill -f "mcp.*server.py"
```

### Cursor Not Detecting MCP

1. Ensure `.cursor/settings.json` exists
2. Check MCP is enabled in Cursor settings
3. Restart Cursor completely
4. Check console for errors (View → Toggle Developer Tools)

### Sophia CLI Issues

```bash
# Reinstall Sophia CLI
cd ../sophia-intel-ai
pip uninstall sophia-cli
pip install -e .

# Check configuration
sophia config list

# Reset configuration
sophia config reset

# Verbose mode for debugging
sophia --verbose chat "Test"
```

### Port Conflicts

```bash
# Find process using port
lsof -i :8081

# Kill process
kill -9 <PID>

# Or use different ports in .env.local
MCP_MEMORY_PORT=9081
MCP_FILESYSTEM_PORT=9082
# etc...
```

---

## 📚 Additional Resources

### Documentation
- [MCP Protocol Specification](../sophia-intel-ai/docs/MCP_PROTOCOL.md)
- [Sophia CLI Documentation](../sophia-intel-ai/docs/SOPHIA_CLI.md)
- [Cursor Integration Guide](./docs/CURSOR_INTEGRATION.md)
- [Cline Setup Guide](./docs/CLINE_SETUP.md)

### Examples
- [MCP Client Examples](./examples/mcp-client/)
- [Sophia CLI Scripts](./examples/sophia-scripts/)
- [Cursor Workflows](./examples/cursor-workflows/)

### Support
- GitHub Issues: [workbench-ui/issues](https://github.com/ai-cherry/workbench-ui/issues)
- Discord: [Join our server](https://discord.gg/sophia-ai)
- Documentation: [docs.sophia-ai.com](https://docs.sophia-ai.com)

---

## ✅ Verification Checklist

- [ ] Node.js 18+ installed
- [ ] Python 3.11+ installed
- [ ] All environment variables set
- [ ] MCP servers running (ports 8081-8085)
- [ ] Cursor configured with MCP
- [ ] Cline configured with MCP
- [ ] Sophia CLI installed and working
- [ ] Can run `npm run dev` successfully
- [ ] Can access http://localhost:3000
- [ ] MCP health endpoints responding

---

## 🎯 Next Steps

1. **Explore the UI**: Navigate to http://localhost:3000
2. **Test MCP Integration**: Try the MCP dashboard at /mcp
3. **Use AI Assistants**: Test Cursor and Cline with your code
4. **Try Sophia CLI**: Generate some code or get assistance
5. **Build Features**: Start developing your application!

---

*Last Updated: November 2024*
*Version: 1.0.0*