"""
Sophia Intel AI Control Center - FastAPI Backend
AgentOS-style runtime for managing Sophia with full deployment capabilities
"""

import os
import asyncio
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
import httpx
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Testing toggle (affects external checks in health)
TESTING = os.getenv("TESTING", "false").lower() in ("1", "true", "yes")
RESTRICT_MCP_PROXY = os.getenv("RESTRICT_MCP_PROXY", "false").lower() in ("1", "true", "yes")

# Optional allowlist of MCP proxy path prefixes when restriction is enabled
ALLOWED_MCP_PATHS = {
    "memory": {"health", "store", "retrieve", "search", "delete"},
    "filesystem": {"health", "read", "write", "list", "delete"},
    "git": {"health", "status", "diff", "log", "symbols"},
    "vector": {"health", "embed", "search", "index", "store", "delete", "stats"},
}

# App initialization
app = FastAPI(
    title="Sophia Intel AI Control Center",
    version="2.0.0",
    description="Unified control interface for Sophia Intel AI with AgentOS patterns"
)

# CORS for UI (env-driven, sensible defaults)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
ALLOW_CREDENTIALS = os.getenv("ALLOW_CREDENTIALS", "false").lower() in ("1", "true", "yes")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS.split(",") if o.strip()],
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security (minimal for single user)
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "sophia-intel-ai-control-center-key-2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "7"))
ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
TOKEN_ISSUER = os.getenv("JWT_ISSUER")
TOKEN_AUDIENCE = os.getenv("JWT_AUDIENCE")

# Fail-fast for missing secrets in production
if ENVIRONMENT == "production":
    if SECRET_KEY == "sophia-intel-ai-control-center-key-2025":
        raise RuntimeError("JWT_SECRET_KEY must be set in production")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Single user auth (CEO)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "ceo")
# Prefer hashed password via env, fallback to hashing provided plaintext
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH")
if not ADMIN_PASSWORD_HASH:
    admin_pw = os.getenv("ADMIN_PASSWORD", "payready2025")
    if ENVIRONMENT == "production" and admin_pw == "payready2025":
        raise RuntimeError("ADMIN_PASSWORD must be set in production")
    ADMIN_PASSWORD_HASH = pwd_context.hash(admin_pw)

# MCP Server connections
MCP_SERVERS = {
    "memory": {"url": "http://localhost:8081", "name": "Knowledge Graph Memory"},
    "filesystem": {"url": "http://localhost:8082", "name": "File System Access"},
    "git": {"url": "http://localhost:8084", "name": "Git Repository Control"},
    "vector": {"url": "http://localhost:8085", "name": "Vector Embeddings"}
}

# Pydantic models
class Message(BaseModel):
    role: str = Field(..., description="Message role: user/assistant/system/tool")
    content: str = Field(..., description="Message content")
    metadata: Optional[Dict[str, Any]] = None

class AgentRequest(BaseModel):
    messages: List[Message]
    agent: str = Field(default="orchestrator", description="Agent to use")
    stream: bool = Field(default=True, description="Stream response")
    tools: Optional[List[str]] = Field(default=None, description="Tools to enable")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")

class DeploymentRequest(BaseModel):
    target: str = Field(..., description="Deployment target: staging/production")
    service: str = Field(..., description="Service to deploy")
    version: Optional[str] = Field(default="latest", description="Version to deploy")
    rollback: bool = Field(default=False, description="Rollback deployment")

class CommandRequest(BaseModel):
    command: str = Field(..., description="Command to execute")
    service: str = Field(..., description="Target service/repository")
    args: Optional[Dict[str, Any]] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Auth helpers
def create_access_token(data: dict):
    to_encode = data.copy()
    if ACCESS_TOKEN_EXPIRE_MINUTES is not None and ACCESS_TOKEN_EXPIRE_MINUTES.isdigit():
        expire = datetime.utcnow() + timedelta(minutes=int(ACCESS_TOKEN_EXPIRE_MINUTES))
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    if TOKEN_ISSUER:
        to_encode["iss"] = TOKEN_ISSUER
    if TOKEN_AUDIENCE:
        to_encode["aud"] = TOKEN_AUDIENCE
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username != ADMIN_USERNAME:
            raise HTTPException(status_code=403, detail="Not authorized")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")

# Auth endpoints (minimal)
@app.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Single user login for CEO"""
    if request.username != ADMIN_USERNAME or not pwd_context.verify(request.password, ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": request.username})
    return TokenResponse(access_token=access_token)

# Health check
@app.get("/health")
async def health_check():
    """System health status including MCP servers"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }
    
    if TESTING:
        # Fast path for tests: don't call external services
        for service_id, config in MCP_SERVERS.items():
            health_status["services"][service_id] = {
                "name": config["name"],
                "status": "offline",
                "url": config["url"]
            }
    else:
        # Check MCP servers
        async with httpx.AsyncClient(timeout=5.0) as client:
            for service_id, config in MCP_SERVERS.items():
                try:
                    response = await client.get(f"{config['url']}/health")
                    health_status["services"][service_id] = {
                        "name": config["name"],
                        "status": "online" if response.status_code == 200 else "degraded",
                        "url": config["url"]
                    }
                except Exception as e:
                    health_status["services"][service_id] = {
                        "name": config["name"],
                        "status": "offline",
                        "error": str(e)
                    }
    
    return JSONResponse(health_status)

# Agent execution endpoint with SSE streaming
@app.post("/agent/execute")
async def execute_agent(
    request: AgentRequest,
    current_user: str = Depends(get_current_user)
):
    """Execute agent with full Sophia control capabilities"""
    
    async def stream_response():
        # Import agent here to avoid circular deps
        from app.agents.sophia_controller import get_agent
        
        agent = get_agent(request.agent)
        
        # Emit initial thinking/reasoning
        yield "event: thinking\n"
        yield f"data: {json.dumps({'text': f'Analyzing request with {request.agent} agent...'})}\n\n"
        
        # Process with agent
        try:
            # Get the last user message
            user_message = request.messages[-1].content if request.messages else ""
            
            # Execute agent with streaming
            response = await agent.arun(
                user_message,
                stream=request.stream,
                context=request.context
            )
            
            # Stream tokens
            if request.stream:
                for token in response.get("tokens", []):
                    yield f"data: {json.dumps({'token': token})}\n\n"
                    await asyncio.sleep(0.01)
            
            # Emit tool calls if any
            for tool_call in response.get("tool_calls", []):
                yield "event: tool_start\n"
                yield f"data: {json.dumps(tool_call)}\n\n"
                await asyncio.sleep(0.1)
                yield "event: tool_end\n"
                yield f"data: {json.dumps(tool_call)}\n\n"
            
            # Final response
            yield f"data: {json.dumps({'content': response.get('content', '')})}\n\n"
            
        except Exception as e:
            yield "event: error\n"
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        # End stream
        yield "event: end\n"
        yield "data: [DONE]\n\n"
    
    if request.stream:
        return StreamingResponse(stream_response(), media_type="text/event-stream")
    else:
        # Non-streaming response
        from app.agents.sophia_controller import get_agent
        agent = get_agent(request.agent)
        user_message = request.messages[-1].content if request.messages else ""
        response = await agent.arun(user_message, stream=False, context=request.context)
        return JSONResponse(response)

# Deployment endpoint (IaC control)
@app.post("/deploy")
async def deploy_service(
    request: DeploymentRequest,
    current_user: str = Depends(get_current_user)
):
    """Deploy Sophia Intel AI services to Fly.io"""
    
    from app.agents.deployment_agent import DeploymentAgent
    
    agent = DeploymentAgent()
    result = await agent.deploy(
        target=request.target,
        service=request.service,
        version=request.version,
        rollback=request.rollback
    )
    
    return JSONResponse({
        "status": result.get("status"),
        "deployment_id": result.get("deployment_id"),
        "url": result.get("url"),
        "logs": result.get("logs", [])
    })

# Command execution endpoint
@app.post("/command")
async def execute_command(
    request: CommandRequest,
    current_user: str = Depends(get_current_user)
):
    """Execute commands on Sophia Intel AI repository"""
    
    from app.agents.command_agent import CommandAgent
    
    agent = CommandAgent()
    result = await agent.execute(
        command=request.command,
        service=request.service,
        args=request.args
    )
    
    return JSONResponse({
        "status": result.get("status"),
        "output": result.get("output"),
        "error": result.get("error")
    })

# MCP Server proxy endpoints
@app.get("/mcp/{service}/{path:path}")
async def proxy_mcp_request(
    service: str,
    path: str,
    current_user: str = Depends(get_current_user)
):
    """Proxy requests to MCP servers"""
    if service not in MCP_SERVERS:
        raise HTTPException(status_code=404, detail=f"Service {service} not found")
    # Basic path validation to prevent traversal/SSRFi
    if ".." in path or path.startswith("http") or path.startswith("//"):
        raise HTTPException(status_code=400, detail="Invalid path")

    # Enforce optional allowlist of path prefixes
    if RESTRICT_MCP_PROXY:
        first = path.split("?")[0].lstrip("/").split("/", 1)[0]
        if first not in ALLOWED_MCP_PATHS.get(service, set()):
            raise HTTPException(status_code=403, detail="Endpoint not allowed")

    async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
        try:
            response = await client.get(f"{MCP_SERVERS[service]['url']}/{path}")
            # Pass through JSON, include status code
            return JSONResponse(response.json(), status_code=response.status_code)
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

@app.post("/mcp/{service}/{path:path}")
async def proxy_mcp_post(
    service: str,
    path: str,
    body: dict,
    current_user: str = Depends(get_current_user)
):
    """Proxy POST requests to MCP servers"""
    if service not in MCP_SERVERS:
        raise HTTPException(status_code=404, detail=f"Service {service} not found")
    if ".." in path or path.startswith("http") or path.startswith("//"):
        raise HTTPException(status_code=400, detail="Invalid path")

    if RESTRICT_MCP_PROXY:
        first = path.split("?")[0].lstrip("/").split("/", 1)[0]
        if first not in ALLOWED_MCP_PATHS.get(service, set()):
            raise HTTPException(status_code=403, detail="Endpoint not allowed")

    async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
        try:
            response = await client.post(
                f"{MCP_SERVERS[service]['url']}/{path}",
                json=body
            )
            return JSONResponse(response.json(), status_code=response.status_code)
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

# WebSocket for real-time updates
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time system updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Send heartbeat and system status
            await websocket.send_json({
                "type": "heartbeat",
                "timestamp": datetime.utcnow().isoformat()
            })
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# GraphQL endpoint
import strawberry
from strawberry.fastapi import GraphQLRouter

@strawberry.type
class Service:
    id: str
    name: str
    status: str
    url: Optional[str]

@strawberry.type
class SystemHealth:
    status: str
    timestamp: str
    services: List[Service]

@strawberry.type
class Query:
    @strawberry.field
    async def system_health(self) -> SystemHealth:
        health = await health_check()
        health_data = health.body.decode() if hasattr(health, 'body') else health
        if isinstance(health_data, str):
            health_data = json.loads(health_data)
        
        services = [
            Service(
                id=sid,
                name=sdata.get("name"),
                status=sdata.get("status"),
                url=sdata.get("url")
            )
            for sid, sdata in health_data.get("services", {}).items()
        ]
        
        return SystemHealth(
            status=health_data.get("status"),
            timestamp=health_data.get("timestamp"),
            services=services
        )

schema = strawberry.Schema(query=Query)
graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize system on startup"""
    print("🚀 Sophia Intel AI Control Center starting...")
    print(f"📡 MCP Servers configured: {list(MCP_SERVERS.keys())}")
    print(f"🔐 Auth enabled for user: {ADMIN_USERNAME}")
    print("✅ System ready at http://localhost:8000")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
