# Backend (FastAPI) Overview

Backend provides authentication, agent execution with SSE streaming, MCP server proxy, deployment/command agents, WebSocket heartbeat, and GraphQL health.

## Endpoints

- `POST /auth/login` → `{ access_token }`. Body: `{ username, password }`.
- `GET /health` → `{ status, timestamp, services: { memory|filesystem|git|vector: { status, url, ... } } }`.
- `POST /agent/execute` (SSE if `stream: true`): Body `{ agent, messages, stream, tools?, context? }`.
  - SSE events:
    - `event: thinking` + `data: { text: string }`
    - `data: { token: string }` (streamed tokens)
    - `event: tool_start` + `data: {...}`
    - `event: tool_end` + `data: {...}`
    - `data: { content: string }` (final)
    - `event: error` + `data: { error: string }`
    - `event: end` + `data: [DONE]`
- `POST /deploy` → deploy service (see code for inputs `{ target, service, version?, rollback? }`).
- `POST /command` → execute allowlisted repo commands.
- `GET /mcp/{service}/{path}` and `POST /mcp/{service}/{path}` → proxy to MCP services with validation.
- `GET /ws` → WebSocket heartbeat.
- `POST /graphql` → Strawberry GraphQL: `system_health` query.

## Security & Env Vars

- `ENVIRONMENT`: `development` (default) or `production`.
- `JWT_SECRET_KEY`: required in production.
- `ADMIN_USERNAME`: admin username (default `ceo`).
- `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`: required in production. If hash provided, password not required.
- `ACCESS_TOKEN_EXPIRE_DAYS`: token TTL (default `7`).
- `TESTING`: set to `true` to avoid external calls in `/health` during tests.
- `RESTRICT_MCP_PROXY`: if `true`, only allow allowlisted prefixes per service.
- `ALLOW_FULL_PRIVILEGE_COMMANDS`: guards custom arbitrary commands (default `false`).
- `SAFE_COMMANDS_ONLY`: restricts git/docker operations to safe allowlists.
- `FLY_API_TOKEN`, `GITHUB_TOKEN`: used by deployment/command agents when enabled.

## MCP Proxy Safeguards

- Blocks traversal and URL injection: rejects `..`, `http*`, and `//` in `path`.
- Optional allowlist: when `RESTRICT_MCP_PROXY=true`, only allow known prefixes:
  - memory: `health, store, retrieve, search, delete`
  - filesystem: `health, read, write, list, delete`
  - git: `health, status, diff, log, symbols`
  - vector: `health, embed, search, index, store, delete, stats`

## CORS

Enabled for `http://localhost:3000` and `http://localhost:3001` by default. Adjust in `app.add_middleware(CORSMiddleware, ...)`.

## Running Locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export ENVIRONMENT=development
uvicorn app.main:app --reload --port 8000
```

## Tests

```bash
cd backend
pip install pytest pytest-asyncio
export TESTING=true
python -m pytest -q tests
```

## Deployment

- See `.github/workflows/deploy.yml`
- Ensure secrets set via Fly and GitHub (API keys, tokens).

## Notes

- Command agent defaults to safe policies; use env toggles cautiously in production.
- MCP servers expected at localhost ports (memory 8081, filesystem 8082, git 8084, vector 8085).

