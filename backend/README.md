# 🚀 Sophia Intel AI Control Center

## Overview
Unified control interface for Sophia Intel AI with Agno 2.0 agents providing full deployment and management capabilities.

## Architecture

```
┌─────────────────────────────────────────┐
│   Sophia Control Center (Port 8000)      │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  FastAPI + SSE + WebSocket + GraphQL│ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │       Agno 2.0 Agents              │ │
│  │  • Orchestrator (Full control)     │ │
│  │  • Developer (Code generation)     │ │
│  │  • Infrastructure (Deployments)    │ │
│  │  • Monitor (Health checks)         │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │    MCP Server Integration          │ │
│  │  • Memory (8081)  • Git (8084)     │ │
│  │  • Files (8082)   • Vector (8085)  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Quick Start

### 1. Local Development

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your credentials

# Run locally
uvicorn app.main:app --reload --port 8000

# Access at http://localhost:8000
# GraphQL at http://localhost:8000/graphql
# Docs at http://localhost:8000/docs
```

### 2. Authentication

Single user system (CEO only):
```bash
# Default credentials (change in production)
Username: ceo
Password: payready2025

# Get token
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "ceo", "password": "payready2025"}'

# Use token in requests
curl http://localhost:8000/agent/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Deploy Sophia to staging"}], "agent": "orchestrator"}'
```

### 3. Deploy to Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly
fly auth login

# Create app (first time only)
cd backend
fly apps create sophia-control-center --org payready

# Set secrets
fly secrets set \
  ADMIN_PASSWORD="your-secure-password" \
  JWT_SECRET_KEY="your-jwt-secret" \
  GITHUB_TOKEN="ghp_..." \
  FLY_API_TOKEN="fly_..." \
  OPENAI_API_KEY="sk-..." \
  ANTHROPIC_API_KEY="sk-ant-..." \
  --app sophia-control-center

# Deploy
fly deploy

# Access at https://sophia-control-center.fly.dev
```

## API Endpoints

### REST API

- `POST /auth/login` - Get JWT token
- `GET /health` - System health with MCP server status
- `POST /agent/execute` - Execute agent with SSE streaming
- `POST /deploy` - Deploy services to Fly.io
- `POST /command` - Execute commands on Sophia repository
- `GET/POST /mcp/{service}/{path}` - Proxy to MCP servers
- `WS /ws` - WebSocket for real-time updates

### GraphQL

```graphql
# Query system health
query {
  systemHealth {
    status
    timestamp
    services {
      id
      name
      status
      url
    }
  }
}
```

### SSE Streaming

```javascript
const eventSource = new EventSource('/agent/execute', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

eventSource.addEventListener('thinking', (e) => {
  console.log('Agent thinking:', e.data);
});

eventSource.addEventListener('tool_start', (e) => {
  console.log('Tool started:', e.data);
});

eventSource.addEventListener('message', (e) => {
  console.log('Token:', e.data);
});

eventSource.addEventListener('end', () => {
  eventSource.close();
});
```

## Agent Capabilities

### Orchestrator Agent
- Full control over Sophia Intel AI repository
- Read/write any file
- Commit and push changes
- Deploy to staging/production
- Scale services
- Execute any command

### Developer Agent
- Generate new modules
- Optimize code
- Run tests and linting
- Format code
- Analyze code quality

### Infrastructure Agent
- Deploy to Fly.io
- Blue-green deployments
- Rollback capabilities
- Scale instances
- Provision new infrastructure

### Monitor Agent
- Track system health
- Alert on issues
- Generate reports
- Suggest optimizations

## Command Examples

### Deploy Sophia
```bash
curl -X POST https://sophia-control-center.fly.dev/deploy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "staging",
    "service": "api",
    "version": "latest"
  }'
```

### Execute Custom Command
```bash
curl -X POST https://sophia-control-center.fly.dev/command \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "git pull && npm test",
    "service": "sophia-api"
  }'
```

### Use Agent Team
```bash
curl -X POST https://sophia-control-center.fly.dev/agent/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Add a new payment processing module to Sophia and deploy it"}],
    "agent": "team",
    "stream": true
  }'
```

## CI/CD Pipeline

GitHub Actions automatically:
1. Runs tests on push to main
2. Deploys to staging
3. Optionally deploys to production
4. Rollback on failure

Manual deployment:
```bash
# Trigger via GitHub Actions
gh workflow run deploy.yml -f environment=production
```

## Security Notes

- Single user system (CEO only)
- JWT tokens expire after 30 days
- All secrets in environment variables
- No hardcoded credentials
- Full audit logging of commands

## Monitoring

- Health endpoint: `/health`
- GraphQL introspection: `/graphql`
- WebSocket heartbeat: `/ws`
- Fly.io metrics: `fly logs --app sophia-control-center`

## Rollback

```bash
# Automatic rollback on deployment failure
# Manual rollback
fly releases --app sophia-control-center
fly deploy --app sophia-control-center --image-label v[PREVIOUS_VERSION]
```

## Development

```bash
# Run tests
pytest tests/ -v

# Format code
black app/
isort app/

# Lint
ruff check app/

# Type check
mypy app/
```

## Support

This is internal tooling for Pay Ready. The Workbench UI agents have full control over Sophia Intel AI for maximum development velocity.

**Warning**: Agents have FULL PRIVILEGES. They can:
- Execute ANY command
- Modify ANY file
- Deploy to production
- Access all MCP servers
- Control infrastructure

This is by design for rapid development. Use with caution.