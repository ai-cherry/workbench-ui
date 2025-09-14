# Workbench UI

A modern Next.js frontend for Sophia Intel AI, featuring MCP (Model Context Protocol) integration, AI-powered development tools, and seamless connection with Cursor and Cline.

## 🚀 Quick Start

```bash
# 1. Clone and setup
git clone https://github.com/ai-cherry/workbench-ui.git
cd workbench-ui
chmod +x scripts/setup.sh
./scripts/setup.sh

# 2. Configure environment
# Edit .env.local and add your API keys

# 3. Start development
npm run dev
```

## 🏗️ Architecture

```
workbench-ui/
├── .cursor/           # Cursor IDE configuration with MCP
├── .cline/            # Cline extension MCP settings
├── src/
│   ├── app/          # Next.js App Router pages
│   ├── components/   # React components
│   ├── lib/          # Core libraries (MCP client)
│   ├── hooks/        # React hooks
│   ├── types/        # TypeScript definitions
│   └── utils/        # Utility functions
├── scripts/          # Setup and automation scripts
└── docs/            # Documentation
```

## 🔌 MCP Integration

This project integrates with 5 MCP servers from sophia-intel-ai:

| Server | Port | Purpose |
|--------|------|---------|
| Memory | 8081 | Context storage |
| Filesystem | 8082 | Safe file operations |
| Analytics | 8083 | Usage metrics |
| Git | 8084 | Repository operations |
| Unified | 8085 | Orchestrator |

## 🤖 AI Development Tools

### Cursor (Primary IDE)
- Pre-configured with MCP servers
- Automatic context from sophia-intel-ai
- Settings in `.cursor/settings.json`

### Cline (VS Code Extension)
- MCP-enabled for enhanced AI assistance
- Configuration in `.cline/mcp_settings.json`

### Sophia CLI
- Command-line AI assistant
- Direct integration with Portkey
- Install: `cd ../sophia-intel-ai && pip install -e .`

## 📦 Installation

### Prerequisites
- Node.js 18+
- Python 3.11+
- Git
- Cursor IDE (recommended)
- VS Code with Cline extension (optional)

### Manual Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Start MCP servers (in sophia-intel-ai)
cd ../sophia-intel-ai
./startup.sh

# Start development
npm run dev
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run test       # Run tests
npm run format     # Format code with Prettier
```

### Using Sophia CLI

```bash
# Basic usage
sophia chat "How do I create a new component?"
sophia code "Generate a React hook for API calls"
sophia plan "Design a dashboard layout"

# With MCP integration
sophia mcp store --key "context" --value "Working on dashboard"
sophia mcp search --query "dashboard"
```

### Using Cursor with MCP

1. Open project in Cursor
2. MCP servers auto-connect
3. Use Cmd+K for AI assistance
4. Context automatically includes sophia-intel-ai

### Using Cline with MCP

1. Open in VS Code
2. Activate Cline (Cmd+Shift+P → "Cline: Open")
3. MCP provides enhanced context
4. Use `/mcp` prefix for MCP commands

## 🔧 Configuration

### Environment Variables

```env
# Required API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PORTKEY_API_KEY=pk-...

# MCP Ports (defaults shown)
MCP_MEMORY_PORT=8081
MCP_FILESYSTEM_PORT=8082
MCP_ANALYTICS_PORT=8083
MCP_GIT_PORT=8084
MCP_UNIFIED_PORT=8085

# Backend
SOPHIA_BACKEND_PATH=../sophia-intel-ai
SOPHIA_API_URL=http://localhost:8000
```

## 📚 Documentation

- [Setup Guide](./SETUP_GUIDE.md) - Detailed setup instructions
- [MCP Integration](./docs/MCP_INTEGRATION.md) - MCP server details
- [Cursor Workflows](./docs/CURSOR_WORKFLOWS.md) - Cursor usage patterns
- [Sophia CLI Guide](./docs/SOPHIA_CLI.md) - CLI commands reference

## 🐛 Troubleshooting

### MCP Servers Not Connecting
```bash
# Check if servers are running
curl http://localhost:8081/health

# Restart servers
cd ../sophia-intel-ai
pkill -f "mcp.*server.py"
./startup.sh
```

### Sophia CLI Not Found
```bash
# Reinstall
cd ../sophia-intel-ai
pip install -e .

# Add to PATH
export PATH="$HOME/.local/bin:$PATH"
```

### Cursor MCP Issues
1. Check `.cursor/settings.json` exists
2. Restart Cursor
3. View → Toggle Developer Tools for errors

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🔗 Links

- [Sophia Intel AI](https://github.com/ai-cherry/sophia-intel-ai)
- [Documentation](https://docs.sophia-ai.com)
- [Discord Community](https://discord.gg/sophia-ai)

---

Built with ❤️ by AI Cherry