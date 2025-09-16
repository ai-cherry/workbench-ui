# Workbench UI

Workbench UI is a Next.js 14 dashboard for operating the Sophia Intel AI agent platform. It surfaces agent orchestration, MCP (Model Context Protocol) services, and live telemetry from the shared backend.

## Getting Started

```bash
git clone https://github.com/ai-cherry/workbench-ui.git
cd workbench-ui
chmod +x scripts/setup.sh
./scripts/setup.sh
npm run dev
```

Full environment and backend instructions live in [`docs/SETUP.md`](docs/SETUP.md).

## Documentation Map
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) – combined system and UI architecture
- [`docs/SETUP.md`](docs/SETUP.md) – quick start + detailed setup
- [`docs/BACKEND.md`](docs/BACKEND.md) – FastAPI control plane reference
- [`docs/MCP_SERVERS_GUIDE.md`](docs/MCP_SERVERS_GUIDE.md) – MCP specifics
- [`docs/reports`](docs/reports) – security, documentation, and audit reports

## Project Structure

```
src/
├── app/         # App Router routes, layouts, API handlers
├── components/  # UI primitives, agent widgets, status cards
├── core/        # Domain services and adapters
├── lib/         # MCP client utilities and shared helpers
├── types/       # TypeScript contracts
└── config/      # Runtime configuration and constants
```

## MCP Integration & Tooling
- Pre-configured MCP credentials for Cursor (`.cursor/settings.json`) and Cline (`.cline/mcp_settings.json`).
- Integrates Memory, Filesystem, Git, and Vector MCP servers from the `sophia-intel-ai` repo.
- Streaming responses from the backend surface in the Agents dashboard Trace panel.

## Development Scripts

```bash
npm run dev     # local development
npm run build   # production build
npm run start   # serve production build
npm run lint    # linting
npm run test    # tests
```

## Agents Dashboard Highlights
- Control orchestrator, developer, infrastructure, monitor, and team agents via `/agents`.
- SSE log viewer shows thinking, tool invocations, and output tokens in real time.
- Health view mirrors backend + MCP status, leveraging shared telemetry endpoints.

## Git Workflow
Use the helper script to sync changes:

```bash
./scripts/git-sync.sh "chore: describe change"
```

Secrets and MCP credentials remain outside version control (`.env.local`, `.roo/mcp.json`). For GitHub MCP setup, review [`docs/GITHUB_APP_SETUP_GUIDE.md`](docs/GITHUB_APP_SETUP_GUIDE.md).
