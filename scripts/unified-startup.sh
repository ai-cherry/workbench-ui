#!/bin/bash

# Sophia Intel AI - Unified System Startup
# This script orchestrates the entire system startup with proper sequencing and validation

set -e

# ============================================
# Configuration
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SOPHIA_BACKEND="/Users/lynnmusil/sophia-intel-ai"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/.pids"
CONFIG_FILE="$PROJECT_ROOT/config/sophia.config.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# MCP Server Configuration
declare -A MCP_SERVERS=(
    ["memory"]="8081"
    ["filesystem"]="8082"
    ["git"]="8084"
    ["vector"]="8085"
)

declare -A MCP_HEALTH_ENDPOINTS=(
    ["memory"]="/health"
    ["filesystem"]="/health"
    ["git"]="/health"
    ["vector"]="/health"
)

# Service dependencies
declare -A SERVICE_DEPS=(
    ["memory"]="redis"
    ["filesystem"]=""
    ["git"]=""
    ["vector"]="memory"
)

# ============================================
# Helper Functions
# ============================================

log() {
    echo -e "${2:-$NC}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_info() {
    log "$1" "$BLUE"
}

log_success() {
    log "✅ $1" "$GREEN"
}

log_warning() {
    log "⚠️  $1" "$YELLOW"
}

log_error() {
    log "❌ $1" "$RED"
}

log_section() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    mkdir -p "$LOG_DIR"
    mkdir -p "$PID_DIR"
    mkdir -p "$PROJECT_ROOT/config/environments"
    mkdir -p "$PROJECT_ROOT/.architecture"
    mkdir -p "$PROJECT_ROOT/deployment"
    log_success "Directories created"
}

# Check if a port is in use
is_port_in_use() {
    local port=$1
    lsof -i :$port >/dev/null 2>&1
}

# Kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -t -i:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        log_warning "Killing process $pid on port $port"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Check if Redis is running
check_redis() {
    if redis-cli ping >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Start Redis if needed
start_redis() {
    if ! check_redis; then
        log_info "Starting Redis..."
        if command -v redis-server >/dev/null 2>&1; then
            redis-server --daemonize yes --dir "$PROJECT_ROOT" --logfile "$LOG_DIR/redis.log"
            sleep 2
            if check_redis; then
                log_success "Redis started successfully"
            else
                log_error "Failed to start Redis"
                return 1
            fi
        else
            log_error "Redis is not installed. Please install Redis first."
            return 1
        fi
    else
        log_success "Redis is already running"
    fi
}

# Check MCP server health
check_mcp_health() {
    local server=$1
    local port=${MCP_SERVERS[$server]}
    local endpoint=${MCP_HEALTH_ENDPOINTS[$server]}
    
    if curl -s -f "http://localhost:$port$endpoint" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Wait for MCP server to be healthy
wait_for_mcp_server() {
    local server=$1
    local port=${MCP_SERVERS[$server]}
    local max_attempts=30
    local attempt=0
    
    log_info "Waiting for $server server on port $port..."
    
    while [ $attempt -lt $max_attempts ]; do
        if check_mcp_health "$server"; then
            log_success "$server server is healthy"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
        echo -n "."
    done
    
    echo ""
    log_error "$server server failed to start (timeout after $max_attempts seconds)"
    return 1
}

# Start MCP server
start_mcp_server() {
    local server=$1
    local port=${MCP_SERVERS[$server]}
    
    # Check dependencies
    local deps="${SERVICE_DEPS[$server]}"
    if [ ! -z "$deps" ]; then
        if [ "$deps" = "redis" ] && ! check_redis; then
            log_error "$server server requires Redis to be running"
            return 1
        fi
        if [ "$deps" = "memory" ] && ! check_mcp_health "memory"; then
            log_error "$server server requires Memory server to be running"
            return 1
        fi
    fi
    
    # Check if already running
    if check_mcp_health "$server"; then
        log_success "$server server is already running on port $port"
        return 0
    fi
    
    # Kill any existing process on the port
    kill_port $port
    
    # Start the server
    log_info "Starting $server server on port $port..."
    
    if [ -d "$SOPHIA_BACKEND" ]; then
        cd "$SOPHIA_BACKEND"
        
        case "$server" in
            "memory")
                nohup python3 -m uvicorn mcp.memory_server:app \
                    --host 0.0.0.0 --port $port \
                    > "$LOG_DIR/mcp-$server.log" 2>&1 &
                ;;
            "filesystem")
                nohup python3 -m uvicorn mcp.filesystem.server:app \
                    --host 0.0.0.0 --port $port \
                    > "$LOG_DIR/mcp-$server.log" 2>&1 &
                ;;
            "git")
                nohup python3 -m uvicorn mcp.git.server:app \
                    --host 0.0.0.0 --port $port \
                    > "$LOG_DIR/mcp-$server.log" 2>&1 &
                ;;
            "vector")
                nohup python3 -m uvicorn mcp.vector.server:app \
                    --host 0.0.0.0 --port $port \
                    > "$LOG_DIR/mcp-$server.log" 2>&1 &
                ;;
        esac
        
        echo $! > "$PID_DIR/mcp-$server.pid"
        cd "$PROJECT_ROOT"
    else
        log_error "Sophia backend directory not found at $SOPHIA_BACKEND"
        return 1
    fi
    
    # Wait for server to be healthy
    wait_for_mcp_server "$server"
}

# Start all MCP servers in dependency order
start_all_mcp_servers() {
    log_section "Starting MCP Servers"
    
    # Start in dependency order
    local start_order=("memory" "filesystem" "git" "vector")
    
    for server in "${start_order[@]}"; do
        if ! start_mcp_server "$server"; then
            log_error "Failed to start $server server"
            return 1
        fi
    done
    
    log_success "All MCP servers started successfully"
    return 0
}

# Validate all services
validate_services() {
    log_section "Validating Services"
    
    local all_healthy=true
    
    # Check Redis
    if check_redis; then
        log_success "Redis: Healthy"
    else
        log_error "Redis: Not running"
        all_healthy=false
    fi
    
    # Check MCP servers
    for server in "${!MCP_SERVERS[@]}"; do
        local port=${MCP_SERVERS[$server]}
        if check_mcp_health "$server"; then
            log_success "$server server (port $port): Healthy"
        else
            log_error "$server server (port $port): Not healthy"
            all_healthy=false
        fi
    done
    
    # Check Workbench UI
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        log_success "Workbench UI (port 3000): Running"
    elif curl -s http://localhost:3201 >/dev/null 2>&1; then
        log_success "Workbench UI (port 3201): Running"
    else
        log_warning "Workbench UI: Not running (start with 'npm run dev')"
    fi
    
    if [ "$all_healthy" = true ]; then
        log_success "All services validated successfully"
        return 0
    else
        log_error "Some services are not healthy"
        return 1
    fi
}

# Generate status report
generate_status_report() {
    log_section "System Status Report"
    
    echo "Sophia Intel AI - Unified System Status"
    echo "========================================"
    echo ""
    echo "Timestamp: $(date)"
    echo ""
    echo "Core Services:"
    echo "  Redis: $(check_redis && echo '✅ Running' || echo '❌ Not running')"
    echo ""
    echo "MCP Servers:"
    for server in "${!MCP_SERVERS[@]}"; do
        local port=${MCP_SERVERS[$server]}
        local status=$(check_mcp_health "$server" && echo '✅ Healthy' || echo '❌ Unhealthy')
        printf "  %-12s (port %s): %s\n" "$server" "$port" "$status"
    done
    echo ""
    echo "API Endpoints:"
    echo "  Memory:      http://localhost:8081"
    echo "  Filesystem:  http://localhost:8082"
    echo "  Git:         http://localhost:8084"
    echo "  Vector:      http://localhost:8085"
    echo ""
    echo "Logs:"
    echo "  Directory: $LOG_DIR"
    echo "  View: tail -f $LOG_DIR/mcp-*.log"
    echo ""
    echo "PIDs:"
    echo "  Directory: $PID_DIR"
    echo ""
}

# Shutdown all services
shutdown_services() {
    log_section "Shutting Down Services"
    
    # Stop MCP servers
    for server in "${!MCP_SERVERS[@]}"; do
        if [ -f "$PID_DIR/mcp-$server.pid" ]; then
            local pid=$(cat "$PID_DIR/mcp-$server.pid")
            if kill -0 $pid 2>/dev/null; then
                log_info "Stopping $server server (PID: $pid)..."
                kill $pid
                rm "$PID_DIR/mcp-$server.pid"
            fi
        fi
    done
    
    log_success "All services shut down"
}

# Cleanup on exit
cleanup() {
    if [ "$1" != "0" ]; then
        log_error "Script interrupted or failed"
    fi
}

# Trap signals
trap 'cleanup $?' EXIT

# ============================================
# Main Execution
# ============================================

main() {
    log_section "Sophia Intel AI - Unified System Startup"
    
    # Parse command line arguments
    case "${1:-}" in
        "stop")
            shutdown_services
            exit 0
            ;;
        "status")
            generate_status_report
            exit 0
            ;;
        "restart")
            shutdown_services
            sleep 2
            ;;
        "validate")
            validate_services
            exit $?
            ;;
        "help"|"--help"|"-h")
            echo "Usage: $0 [start|stop|restart|status|validate|help]"
            echo ""
            echo "Commands:"
            echo "  start    - Start all services (default)"
            echo "  stop     - Stop all services"
            echo "  restart  - Restart all services"
            echo "  status   - Show service status"
            echo "  validate - Validate all services"
            echo "  help     - Show this help message"
            exit 0
            ;;
    esac
    
    # Pre-flight checks
    log_section "Pre-flight Checks"
    
    # Check if running from correct directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        log_error "Must run from workbench-ui directory"
        exit 1
    fi
    log_success "Running from correct directory"
    
    # Check Python installation
    if ! command -v python3 >/dev/null 2>&1; then
        log_error "Python 3 is not installed"
        exit 1
    fi
    log_success "Python 3 is available"
    
    # Create necessary directories
    create_directories
    
    # Start Redis
    log_section "Starting Redis"
    if ! start_redis; then
        log_error "Failed to start Redis"
        exit 1
    fi
    
    # Start MCP servers
    if ! start_all_mcp_servers; then
        log_error "Failed to start all MCP servers"
        exit 1
    fi
    
    # Validate all services
    if ! validate_services; then
        log_warning "Some services are not healthy"
    fi
    
    # Generate final status report
    generate_status_report
    
    log_section "Startup Complete"
    log_success "Sophia Intel AI unified system is ready!"
    echo ""
    echo "Next steps:"
    echo "  1. Start Workbench UI: npm run dev"
    echo "  2. View logs: tail -f $LOG_DIR/mcp-*.log"
    echo "  3. Check status: $0 status"
    echo "  4. Stop services: $0 stop"
    echo ""
}

# Run main function
main "$@"