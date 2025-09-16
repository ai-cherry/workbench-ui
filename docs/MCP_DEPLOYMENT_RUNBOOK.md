# MCP System Deployment Runbook

## Table of Contents
1. [Development Environment Setup](#development-environment-setup)
2. [Production Environment Setup](#production-environment-setup)
3. [Deployment Process](#deployment-process)
4. [Health Monitoring](#health-monitoring)
5. [Troubleshooting](#troubleshooting)
6. [Rollback Procedures](#rollback-procedures)

---

## Development Environment Setup

### Prerequisites
- Python 3.8+ installed
- Node.js 18+ and npm installed
- Redis server running locally
- Git installed
- Optional: Weaviate for Vector server (can run degraded without it)

### 1. Clone Repositories

```bash
# Clone both repositories
cd ~/
git clone [sophia-intel-ai-repo-url] sophia-intel-ai
git clone [workbench-ui-repo-url] workbench-ui
```

### 2. Setup Backend (sophia-intel-ai)

```bash
cd ~/sophia-intel-ai

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp environments/shared-mcp.env .env

# Start MCP servers
./startup_enhanced.sh

# Validate servers
python3 scripts/validate_mcp_servers_enhanced.py --allow-vector-skip
```

### 3. Setup Frontend (workbench-ui)

```bash
cd ~/workbench-ui

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env.local

# Update .env.local with:
# NEXT_PUBLIC_MCP_BASE_URL=http://localhost
# MCP_DEV_BYPASS=1

# Start development server
npm run dev
```

### 4. Verify Installation

```bash
cd ~/workbench-ui
./scripts/test-full-system.sh
```

---

## Production Environment Setup

### Prerequisites
- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- Nginx or similar reverse proxy
- SSL certificates (Let's Encrypt recommended)
- Redis instance (managed service recommended)
- Optional: Weaviate instance for Vector server

### 1. System Requirements

**Minimum Requirements:**
- 4 CPU cores
- 8GB RAM
- 50GB SSD storage
- 100Mbps network connection

**Recommended Requirements:**
- 8 CPU cores
- 16GB RAM
- 100GB SSD storage
- 1Gbps network connection

### 2. Environment Configuration

Create production environment file:

```bash
# /etc/sophia-mcp/production.env
MCP_ENV=production
MCP_AUTH_TOKEN=<secure-random-token>

# Redis Configuration
REDIS_HOST=redis.internal.domain
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

# MCP Server Ports (internal)
# Canonical assignments live in docs/reference/MCP_PORTS.md.

# Weaviate (if available)
WEAVIATE_HOST=weaviate.internal.domain
WEAVIATE_PORT=8080

# Security
MCP_ALLOWED_ORIGINS=https://workbench.yourdomain.com
MCP_RATE_LIMIT=1000
MCP_RATE_WINDOW=60

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/sophia-mcp/mcp.log
```

### 3. Docker Deployment

Create `docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  memory-server:
    image: sophia-mcp/memory-server:latest
    ports:
      - "127.0.0.1:8081:8081"
    environment:
      - MCP_ENV=production
    env_file:
      - /etc/sophia-mcp/production.env
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

  filesystem-server:
    image: sophia-mcp/filesystem-server:latest
    ports:
      - "127.0.0.1:8082:8082"
    volumes:
      - /data/workspace:/workspace:ro
    environment:
      - MCP_ENV=production
    env_file:
      - /etc/sophia-mcp/production.env
    restart: unless-stopped

  git-server:
    image: sophia-mcp/git-server:latest
    ports:
      - "127.0.0.1:8084:8084"
    volumes:
      - /data/repos:/repos:ro
    environment:
      - MCP_ENV=production
    env_file:
      - /etc/sophia-mcp/production.env
    restart: unless-stopped

  vector-server:
    image: sophia-mcp/vector-server:latest
    ports:
      - "127.0.0.1:8085:8085"
    environment:
      - MCP_ENV=production
    env_file:
      - /etc/sophia-mcp/production.env
    restart: unless-stopped

  workbench-ui:
    image: sophia-mcp/workbench-ui:latest
    ports:
      - "127.0.0.1:3201:3201"
    environment:
      - NODE_ENV=production
    env_file:
      - /etc/sophia-mcp/production.env
    restart: unless-stopped
```

### 4. Nginx Configuration

```nginx
# /etc/nginx/sites-available/mcp-system
upstream mcp_memory {
    server 127.0.0.1:8081;
}

upstream mcp_filesystem {
    server 127.0.0.1:8082;
}

upstream mcp_git {
    server 127.0.0.1:8084;
}

upstream mcp_vector {
    server 127.0.0.1:8085;
}

upstream workbench_ui {
    server 127.0.0.1:3201;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req zone=api_limit burst=200 nodelay;

    # MCP Memory Server
    location /mcp/memory/ {
        proxy_pass http://mcp_memory/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # MCP Filesystem Server
    location /mcp/filesystem/ {
        proxy_pass http://mcp_filesystem/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # MCP Git Server
    location /mcp/git/ {
        proxy_pass http://mcp_git/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # MCP Vector Server
    location /mcp/vector/ {
        proxy_pass http://mcp_vector/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

server {
    listen 443 ssl http2;
    server_name workbench.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/workbench.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/workbench.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://workbench_ui;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Deployment Process

### 1. Pre-Deployment Checklist

- [ ] All tests passing in CI/CD
- [ ] Version tags created for release
- [ ] Database backups completed
- [ ] Environment variables updated
- [ ] SSL certificates valid
- [ ] Monitoring alerts configured

### 2. Blue-Green Deployment

```bash
#!/bin/bash
# deploy.sh - Blue-Green Deployment Script

set -e

DEPLOYMENT_ENV=$1
VERSION=$2

if [ -z "$DEPLOYMENT_ENV" ] || [ -z "$VERSION" ]; then
    echo "Usage: ./deploy.sh [staging|production] [version]"
    exit 1
fi

echo "Deploying version $VERSION to $DEPLOYMENT_ENV..."

# Pull new images
docker-compose -f docker-compose.$DEPLOYMENT_ENV.yml pull

# Start new containers (blue)
docker-compose -f docker-compose.$DEPLOYMENT_ENV.yml up -d --scale memory-server=2

# Health check
sleep 10
./scripts/health-check.sh || exit 1

# Switch traffic to new containers
docker-compose -f docker-compose.$DEPLOYMENT_ENV.yml up -d --remove-orphans

# Remove old containers
docker-compose -f docker-compose.$DEPLOYMENT_ENV.yml up -d --scale memory-server=1

echo "Deployment complete!"
```

### 3. Post-Deployment Validation

```bash
# Run system tests
cd ~/workbench-ui
./scripts/test-full-system.sh

# Check logs
docker-compose logs --tail=100

# Monitor metrics
curl https://api.yourdomain.com/mcp/memory/health
curl https://api.yourdomain.com/mcp/filesystem/health
curl https://api.yourdomain.com/mcp/git/health
curl https://api.yourdomain.com/mcp/vector/health
```

---

## Health Monitoring

### 1. Health Check Endpoints

All MCP servers expose health endpoints:
- Memory: `http://localhost:8081/health`
- Filesystem: `http://localhost:8082/health`
- Git: `http://localhost:8084/health`
- Vector: `http://localhost:8085/health`

### 2. Prometheus Metrics

Configure Prometheus to scrape metrics:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'mcp-servers'
    static_configs:
      - targets:
        - 'localhost:8081'
        - 'localhost:8082'
        - 'localhost:8084'
        - 'localhost:8085'
    metrics_path: '/metrics'
```

### 3. Alerting Rules

```yaml
# alerts.yml
groups:
  - name: mcp_alerts
    rules:
      - alert: MCPServerDown
        expr: up{job="mcp-servers"} == 0
        for: 5m
        annotations:
          summary: "MCP Server {{ $labels.instance }} is down"
      
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 1e9
        for: 10m
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
      
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate on {{ $labels.instance }}"
```

---

## Troubleshooting

### Common Issues

#### 1. Server Won't Start

**Symptom:** MCP server fails to start
**Solution:**
```bash
# Check logs
docker logs [container-name]

# Verify environment variables
docker exec [container-name] env | grep MCP

# Check port availability
netstat -tulpn | grep -E "808[1-5]"
```

#### 2. Authentication Failures

**Symptom:** 401 Unauthorized errors
**Solution:**
```bash
# Verify token in environment
echo $MCP_AUTH_TOKEN

# Test with curl
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
     http://localhost:8081/health
```

#### 3. Redis Connection Issues

**Symptom:** Memory server errors
**Solution:**
```bash
# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping

# Check Redis memory
redis-cli info memory
```

#### 4. Vector Server Degraded

**Symptom:** Vector server running but degraded
**Solution:**
```bash
# Check Weaviate connection
curl http://$WEAVIATE_HOST:$WEAVIATE_PORT/v1/schema

# Run without Weaviate (degraded mode)
export VECTOR_ALLOW_DEGRADED=true
docker-compose restart vector-server
```

### Debug Mode

Enable debug logging:
```bash
# Set in environment
export LOG_LEVEL=debug
export MCP_DEBUG=1

# Restart services
docker-compose restart
```

---

## Rollback Procedures

### 1. Quick Rollback

```bash
#!/bin/bash
# rollback.sh - Quick rollback to previous version

PREVIOUS_VERSION=$1

if [ -z "$PREVIOUS_VERSION" ]; then
    echo "Usage: ./rollback.sh [previous-version]"
    exit 1
fi

echo "Rolling back to version $PREVIOUS_VERSION..."

# Stop current containers
docker-compose down

# Pull previous version
docker-compose pull --quiet \
    memory-server:$PREVIOUS_VERSION \
    filesystem-server:$PREVIOUS_VERSION \
    git-server:$PREVIOUS_VERSION \
    vector-server:$PREVIOUS_VERSION \
    workbench-ui:$PREVIOUS_VERSION

# Start previous version
docker-compose up -d

# Verify
./scripts/health-check.sh
```

### 2. Database Rollback

If database schema changes need reverting:
```bash
# Restore Redis backup
redis-cli --rdb /backups/redis-backup-$DATE.rdb

# Restore Weaviate backup (if applicable)
curl -X POST http://localhost:8080/v1/backups/restore \
     -H "Content-Type: application/json" \
     -d '{"backup_id": "backup-'$DATE'"}'
```

### 3. Emergency Recovery

In case of complete system failure:
1. Switch to maintenance mode
2. Restore from latest backup
3. Verify data integrity
4. Gradually bring services online
5. Run full system tests

```bash
# Enable maintenance mode
touch /var/www/maintenance.flag

# Restore services one by one
for service in memory filesystem git vector workbench-ui; do
    docker-compose up -d $service-server
    sleep 10
    ./scripts/health-check.sh $service || exit 1
done

# Disable maintenance mode
rm /var/www/maintenance.flag
```

---

## Maintenance Windows

### Scheduled Maintenance

1. **Notification:** 48 hours before maintenance
2. **Backup:** Complete system backup 1 hour before
3. **Maintenance Mode:** Enable 5 minutes before
4. **Updates:** Apply updates in order:
   - Database migrations
   - Backend services
   - Frontend application
5. **Validation:** Run full test suite
6. **Recovery:** Disable maintenance mode

### Zero-Downtime Updates

For minor updates without downtime:
```bash
# Rolling update
docker-compose up -d --no-deps --scale memory-server=2 memory-server
sleep 30
docker-compose up -d --no-deps --scale memory-server=1 memory-server
```

---

## Contact Information

### Escalation Path

1. **Level 1:** On-call engineer - [oncall@yourdomain.com]
2. **Level 2:** Backend team lead - [backend-lead@yourdomain.com]
3. **Level 3:** Platform architect - [architect@yourdomain.com]

### External Dependencies

- **Redis Support:** [redis-support-ticket-url]
- **Weaviate Support:** [weaviate-support-ticket-url]
- **Infrastructure:** [infrastructure-team@yourdomain.com]

---

## Appendix

### A. Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| MCP_ENV | Environment (development/production) | development | Yes |
| MCP_AUTH_TOKEN | Authentication token | - | Yes |
| REDIS_HOST | Redis server hostname | localhost | Yes |
| REDIS_PORT | Redis server port | 6379 | Yes |
| WEAVIATE_HOST | Weaviate hostname | localhost | No |
| WEAVIATE_PORT | Weaviate port | 8080 | No |
| LOG_LEVEL | Logging level | info | No |
| MCP_RATE_LIMIT | Rate limit per window | 1000 | No |

### B. Port Reference

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Memory Server | 8081 | HTTP | Memory/search operations |
| Filesystem Server | 8082 | HTTP | File operations |
| Git Server | 8084 | HTTP | Git operations |
| Vector Server | 8085 | HTTP | Vector search operations |
| Workbench UI | 3201 | HTTP | Frontend application |

### C. API Endpoint Reference

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete endpoint documentation.

---

*Last Updated: [Current Date]*
*Version: 1.0.0*
