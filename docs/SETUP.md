# Setup Guide

This guide combines the previous quick-start and detailed setup notes into a single reference for bringing Workbench UI online with Sophia Intel AI.

## Prerequisites
- **Node.js** 18 LTS or newer
- **Python** 3.11+ (for MCP servers and backend)
- **Git** 2.30+
- Optional: **Cursor** IDE and **VS Code + Cline** with MCP support

## 5-Minute Quick Start

```bash
# Clone repositories
git clone https://github.com/ai-cherry/workbench-ui.git
cd workbench-ui

# Bootstrap dependencies
chmod +x scripts/setup.sh
./scripts/setup.sh

# The setup script creates .env.local from the template.
# Edit .env.local with API keys for Anthropic, OpenAI, Portkey, etc.

# Start the dev server
npm run dev
# Visit http://localhost:3000
```

## Environment Files & Precedence

1. `.env.master` – canonical placeholder inventory shared with backend automation. Keep this file unchanged and use it as reference.
2. `.env.example` – template that mirrors the fields the UI expects. `scripts/setup.sh` copies this file when bootstrapping a local checkout.
3. `.env.local` – developer-local overrides (git ignored). After copying the template, the setup script appends a "Local development overrides" section with permissive defaults such as `ALLOW_DEV_WRITES=true` and demo admin credentials. Edit values below that marker to suit your workstation.

To recreate `.env.local`, delete it and rerun `./scripts/setup.sh`. Any customisations you add after the overrides block will need to be re-applied manually.

## Manual Setup (If You Skip scripts/setup.sh)

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# populate .env.local with required keys

# Start backend & MCP (in sibling repo)
cd ../sophia-intel-ai
./startup.sh        # boots FastAPI + MCP services
```

### Cursor & Cline MCP Integration
- Cursor ships pre-configured via `.cursor/settings.json`; enable MCP under Settings → MCP.
- VS Code Cline uses `.cline/mcp_settings.json`; load the file from Cline settings and restart the extension.

### Verifying MCP Servers

```bash
curl http://localhost:8081/health  # Memory
curl http://localhost:8082/health  # Filesystem
curl http://localhost:8083/health  # Analytics (optional)
curl http://localhost:8084/health  # Git
curl http://localhost:8085/health  # Unified orchestrator
```

## Running the Backend Locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Default dev credentials: `ceo` / `payready2025`. Adjust via environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, etc.).

## Using the UI
1. Navigate to `http://localhost:3000`.
2. Log into the Agents dashboard at `/agents`.
3. Kick off agent workflows; SSE streaming output appears in the Trace panel.
4. Monitor MCP and backend health under `/health`.

## Deployment Notes
- Fly.io deployments use `Dockerfile.frontend` and `fly.toml.frontend` (rename to `fly.toml` when deploying).
- Update environment variables via Fly secrets or your chosen platform.
- See `docs/GITHUB_APP_SETUP_GUIDE.md` for GitHub MCP integration specifics.
