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

## 🧭 Agents Dashboard (Real, No Mocks)

Control live agents via the backend FastAPI controller with streaming output.

- Open the UI route `/agents` or click “Open Agents Dashboard” on the home page.
- Configure the backend URL via `NEXT_PUBLIC_BACKEND_URL` (defaults to `http://localhost:8000`).
- Login with backend admin credentials (see backend ENV: `ENVIRONMENT`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`/`ADMIN_PASSWORD_HASH`).
- Choose an agent (orchestrator/developer/infrastructure/monitor/team), enter a prompt, and run.
- The Trace panel shows thinking, tool start/end events, tokens, and final content streamed via SSE.

Backend notes:
- CORS allows `http://localhost:3000` by default.
- In production, set secrets and consider enabling `RESTRICT_MCP_PROXY` and `SAFE_COMMANDS_ONLY`.

## 🛠️ Local Runbook

Quick commands to run everything locally:

- MCP servers (in your sophia-intel-ai repo): ensure these respond on localhost
  - Memory: `curl -sf http://localhost:8081/health`
  - Filesystem: `curl -sf http://localhost:8082/health`
  - Git: `curl -sf http://localhost:8084/health`
  - Vector: `curl -sf http://localhost:8085/health`

- Backend (FastAPI):
  ```bash
  cd backend
  python -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  uvicorn app.main:app --reload --port 8000
  ```
  - Health: `curl -sf http://localhost:8000/health | jq`

- Frontend (Next.js):
  ```bash
  npm install
  npm run dev  # http://localhost:3000
  ```

- Use the dashboard:
  - Open http://localhost:3000/agents
  - Login (dev defaults): `ceo` / `payready2025`
  - Control tab: run single agent; pause/resume; retry; clear; copy final
- Workflows tab: select and run workflows from `agno/config.yaml`
- Health tab: backend + MCP statuses


## 🛫 Fly.io Deployment Overview

Two Fly.io apps back the system:

| Service | Fly config | Deploy command |
|---------|------------|----------------|
| Frontend (Next.js) | `./fly.toml` | `fly deploy --config fly.toml` (from repo root) |
| Backend (FastAPI) | `./backend/fly.toml` | `fly deploy --config backend/fly.toml` (from repo root) |

Tips:

- `Dockerfile.frontend` powers the frontend build. Update environment defaults (e.g. `SOPHIA_API_URL`) there or via `fly secrets`.
- The backend reuses the same `backend/fly.toml` documented in `backend/README.md`; run deployments from the repo root to keep relative paths simple.
- Always authenticate first: `fly auth login`, then target the correct app with `--app` if you override the name in the config.


## 🛳️ GitHub Workflow (Simple)

For day-to-day work, use SSH and a single sync command:

1. Ensure your remote is SSH (it already is):
   - `git remote -v` → `origin git@github.com:ai-cherry/workbench-ui.git`
2. Push changes using the helper:
   - `./scripts/git-sync.sh "feat: message"`
3. CI runs type-check/lint/build (frontend) and backend tests automatically.

Notes:
- `.env.local` and the generated `.roo/mcp.json` (from `.roo/mcp.json.template`) are gitignored; keep secrets there locally.
- For managed tokens or GitHub App, see `docs/GITHUB_APP_SETUP_GUIDE.md` (optional).

## 🔑 Secrets & Keys (Simple)

- Local dev:
  - Put secrets in `.env.local` (gitignored). See `.env.example`.
- Generate local MCP config: `./scripts/mcp-config-generate.sh` → writes `.roo/mcp.json` next to `.roo/mcp.json.template` (both stay outside version control).
  - Quick check for missing keys: `./scripts/secrets-check.sh` (non-blocking).
- Cloud:
  - Use provider secrets (Fly: `fly secrets set …`, GitHub Actions secrets).
- See `docs/SECRETS_AND_KEYS.md` for the full, low‑friction plan.

 

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
- [Backend (FastAPI)](./docs/BACKEND.md) - Endpoints, SSE schema, security, env vars, tests

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
