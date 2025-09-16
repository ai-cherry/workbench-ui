# 🚀 Workbench UI - Quick Start Guide

## Your New Repository is Ready!

I've created all the necessary files and configurations for your workbench-ui repository at:
**https://github.com/ai-cherry/workbench-ui**

---

## ✅ What's Been Created

### Core Configuration Files
- **package.json** - Node.js dependencies and scripts
- **tsconfig.json** - TypeScript configuration with strict mode
- **.gitignore** - Comprehensive ignore patterns
- **.env.example** - Environment variables template

### IDE Integration
- **.cursor/settings.json** - Cursor IDE with MCP servers pre-configured
- **.cline/mcp_settings.json** - Cline extension MCP integration

### Documentation
- **README.md** - Project overview and features
- **SETUP_GUIDE.md** - Detailed setup instructions
- **QUICK_START.md** - This file!

### Scripts
- **scripts/setup.sh** - Automated setup script

---

## 🎯 Immediate Next Steps

### 1. Clone Your Repository
```bash
cd ~/
git clone https://github.com/ai-cherry/workbench-ui.git
cd workbench-ui
```

### 2. Run Automated Setup
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 3. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local and add your API keys:
# - ANTHROPIC_API_KEY
# - OPENAI_API_KEY  
# - PORTKEY_API_KEY
```

### 4. Start MCP Servers (in sophia-intel-ai)
```bash
cd ../sophia-intel-ai
./startup.sh
```

### 5. Open in Cursor
```bash
cd ../workbench-ui
cursor .
```
- MCP servers will auto-connect
- Check View → Output → MCP for connection status

### 6. Start Development
```bash
npm run dev
# Open http://localhost:3000
```

---

## 🤖 Using AI Assistants

### Cursor (Primary IDE)
- **Cmd+K** - AI code generation
- **Cmd+L** - Chat with context
- MCP provides automatic context from sophia-intel-ai
- Pre-configured with all 5 MCP servers

### Cline (VS Code)
- Open VS Code in workbench-ui
- **Cmd+Shift+P** → "Cline: Open"
- MCP integration provides enhanced context
- Use `/mcp` prefix for MCP commands

 

---

## 🔌 MCP Server Status Check

Run this to verify all MCP servers are running:
```bash
curl http://localhost:8081/health  # Memory
curl http://localhost:8082/health  # Filesystem
curl http://localhost:8083/health  # Analytics
curl http://localhost:8084/health  # Git
curl http://localhost:8085/health  # Unified
```

---

## 📁 Project Structure

```
workbench-ui/
├── .cursor/              # Cursor IDE configuration
├── .cline/               # Cline extension settings
├── src/
│   ├── app/             # Next.js App Router
│   ├── components/      # React components
│   ├── lib/             # Core libraries
│   ├── hooks/           # React hooks
│   ├── types/           # TypeScript types
│   └── utils/           # Utilities
├── scripts/             # Automation scripts
├── docs/                # Documentation
└── examples/            # Example code
```

---

## 🛠️ Available Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npm run format       # Format with Prettier
```

 

---

## 🔧 Troubleshooting

### MCP Not Connecting
```bash
# Check servers are running
ps aux | grep "mcp.*server.py"

# Restart servers
cd ../sophia-intel-ai
pkill -f "mcp.*server.py"
./startup.sh
```

### Cursor Not Finding MCP
1. Ensure `.cursor/settings.json` exists
2. Restart Cursor completely
3. Check View → Output → MCP for errors

 

---

## 📚 Key Files to Review

1. **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup documentation
2. **[.cursor/settings.json](./.cursor/settings.json)** - Cursor MCP configuration
3. **[.env.example](./.env.example)** - Environment variables to configure
4. **[scripts/setup.sh](./scripts/setup.sh)** - What the setup script does

---

## 🎉 You're Ready to Build!

Your workbench-ui is now:
- ✅ Configured with MCP servers
- ✅ Integrated with Cursor IDE
- ✅ Ready for Next.js development
- ✅ Linked to sophia-intel-ai backend

Start by:
1. Creating your first component
2. Testing MCP integration
3. Using AI assistants for development
4. Building your UI features

---

## 💡 Pro Tips

1. **Always start MCP servers first** before opening Cursor
2. **Use Cursor for heavy coding** - it has the best MCP integration
3. Keep .env.local updated with valid API keys
4. **Keep .env.local updated** with valid API keys
5. **Check MCP health endpoints** if things aren't working

---

## 🆘 Need Help?

- GitHub Issues: [workbench-ui/issues](https://github.com/ai-cherry/workbench-ui/issues)
- Documentation: [SETUP_GUIDE.md](./SETUP_GUIDE.md)

---

Happy coding! 🚀 Your AI-powered development environment is ready!
