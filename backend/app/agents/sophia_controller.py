"""
Sophia Intel AI Controller Agents
Full-privilege agents for managing, deploying, and maintaining Sophia
"""

import os
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.models.anthropic import Claude
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.tools.yfinance import YFinanceTools
from agno.team import Team
import httpx

# MCP Server Integration
class MCPTools:
    """Direct integration with Sophia's MCP servers"""
    
    def __init__(self):
        self.servers = {
            "memory": "http://localhost:8081",
            "filesystem": "http://localhost:8082", 
            "git": "http://localhost:8084",
            "vector": "http://localhost:8085"
        }
    
    async def memory_add(self, key: str, value: Any) -> Dict:
        """Add to Sophia's knowledge graph"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.servers['memory']}/add",
                json={"key": key, "value": value}
            )
            return response.json()
    
    async def memory_query(self, query: str) -> Dict:
        """Query Sophia's knowledge graph"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.servers['memory']}/query",
                json={"query": query}
            )
            return response.json()
    
    async def filesystem_read(self, path: str) -> str:
        """Read file from Sophia repository"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.servers['filesystem']}/read",
                json={"path": f"../sophia-intel-ai/{path}"}
            )
            return response.json().get("content", "")
    
    async def filesystem_write(self, path: str, content: str) -> Dict:
        """Write file to Sophia repository"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.servers['filesystem']}/write",
                json={
                    "path": f"../sophia-intel-ai/{path}",
                    "content": content
                }
            )
            return response.json()
    
    async def git_commit(self, message: str, files: List[str]) -> Dict:
        """Commit changes to Sophia repository"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.servers['git']}/commit",
                json={
                    "repo": "../sophia-intel-ai",
                    "message": message,
                    "files": files
                }
            )
            return response.json()
    
    async def git_push(self, branch: str = "main") -> Dict:
        """Push changes to GitHub"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.servers['git']}/push",
                json={
                    "repo": "../sophia-intel-ai",
                    "branch": branch
                }
            )
            return response.json()
    
    async def vector_search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search Sophia's codebase semantically"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.servers['vector']}/search",
                json={
                    "query": query,
                    "limit": limit,
                    "path": "../sophia-intel-ai"
                }
            )
            return response.json().get("results", [])

# Infrastructure Tools
class InfrastructureTools:
    """Tools for deploying and managing Sophia on Fly.io"""
    
    @staticmethod
    async def deploy_to_fly(service: str, config: Dict) -> Dict:
        """Deploy service to Fly.io"""
        import subprocess
        
        # Build Docker image
        build_cmd = f"cd ../sophia-intel-ai && docker build -t sophia-{service} -f docker/{service}.Dockerfile ."
        result = subprocess.run(build_cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode != 0:
            return {"status": "error", "message": result.stderr}
        
        # Deploy to Fly.io
        deploy_cmd = f"cd ../sophia-intel-ai && fly deploy --app sophia-{service} --image sophia-{service}"
        result = subprocess.run(deploy_cmd, shell=True, capture_output=True, text=True)
        
        return {
            "status": "success" if result.returncode == 0 else "error",
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None,
            "url": f"https://sophia-{service}.fly.dev"
        }
    
    @staticmethod
    async def scale_service(service: str, count: int) -> Dict:
        """Scale Fly.io service"""
        import subprocess
        
        cmd = f"fly scale count {count} --app sophia-{service}"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        return {
            "status": "success" if result.returncode == 0 else "error",
            "output": result.stdout
        }
    
    @staticmethod
    async def rollback(service: str) -> Dict:
        """Rollback to previous deployment"""
        import subprocess
        
        cmd = f"fly releases --app sophia-{service} | grep -v rolled | head -2 | tail -1 | awk '{{print $1}}'"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode == 0 and result.stdout.strip():
            release_id = result.stdout.strip()
            rollback_cmd = f"fly deploy --app sophia-{service} --image-label {release_id}"
            result = subprocess.run(rollback_cmd, shell=True, capture_output=True, text=True)
            
            return {
                "status": "success" if result.returncode == 0 else "error",
                "rolled_back_to": release_id,
                "output": result.stdout
            }
        
        return {"status": "error", "message": "Could not find previous release"}

# Code Generation Tools
class CodeGenerationTools:
    """Tools for generating and modifying Sophia's code"""
    
    @staticmethod
    async def generate_module(spec: Dict) -> str:
        """Generate a new module for Sophia"""
        template = f"""
# Generated module: {spec.get('name')}
# Purpose: {spec.get('purpose')}
# Generated: {datetime.utcnow().isoformat()}

from typing import Dict, Any, List, Optional
import asyncio

class {spec.get('class_name', 'Module')}:
    \"\"\"
    {spec.get('description', 'Auto-generated module')}
    \"\"\"
    
    def __init__(self):
        self.name = "{spec.get('name')}"
        self.version = "1.0.0"
    
    async def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        \"\"\"Main processing function\"\"\"
        # TODO: Implement logic
        return {{"status": "processed", "data": data}}
"""
        return template
    
    @staticmethod
    async def optimize_code(code: str) -> str:
        """Optimize Python code for performance"""
        # This would integrate with code analysis tools
        # For now, return with basic optimizations
        return code.replace("time.sleep", "await asyncio.sleep")

# Main Agent Definitions
def get_orchestrator_agent() -> Agent:
    """Main orchestrator agent with full Sophia control"""
    return Agent(
        name="Sophia Orchestrator",
        role="Master controller for Sophia Intel AI system",
        model=Claude(id="claude-3-opus-20240229"),  # Most capable model
        tools=[MCPTools(), InfrastructureTools(), CodeGenerationTools()],
        instructions=[
            "You have FULL control over the Sophia Intel AI repository",
            "You can read, write, commit, and deploy ANY code",
            "You can modify infrastructure and scale services",
            "Always commit changes with clear messages",
            "Deploy to staging first, then production after validation",
            "Monitor system health after deployments"
        ],
        markdown=True,
        show_tool_calls=True
    )

def get_development_agent() -> Agent:
    """Development agent for code generation and optimization"""
    return Agent(
        name="Sophia Developer",
        role="Code generation and optimization specialist",
        model=OpenAIChat(id="gpt-4-turbo-preview"),
        tools=[MCPTools(), CodeGenerationTools()],
        instructions=[
            "Generate high-quality, production-ready code",
            "Follow Python best practices and type hints",
            "Write comprehensive docstrings",
            "Optimize for performance and maintainability",
            "Always test code before committing"
        ],
        markdown=True,
        show_tool_calls=True
    )

def get_infrastructure_agent() -> Agent:
    """Infrastructure agent for deployments and scaling"""
    return Agent(
        name="Sophia Infrastructure",
        role="Deploy and manage Sophia services on Fly.io",
        model=OpenAIChat(id="gpt-4"),
        tools=[InfrastructureTools(), MCPTools()],
        instructions=[
            "Deploy services with zero downtime",
            "Use blue-green deployment strategies",
            "Monitor resource usage and auto-scale",
            "Maintain high availability",
            "Rollback immediately if issues detected"
        ],
        markdown=True,
        show_tool_calls=True
    )

def get_monitoring_agent() -> Agent:
    """Monitoring agent for system health and alerts"""
    return Agent(
        name="Sophia Monitor",
        role="Monitor system health and performance",
        model=OpenAIChat(id="gpt-4"),
        tools=[MCPTools()],
        instructions=[
            "Continuously monitor all services",
            "Alert on anomalies or errors",
            "Track performance metrics",
            "Suggest optimizations",
            "Generate health reports"
        ],
        markdown=True,
        show_tool_calls=True
    )

def get_sophia_team() -> Team:
    """Full Sophia management team"""
    return Team(
        name="Sophia Control Team",
        members=[
            get_orchestrator_agent(),
            get_development_agent(),
            get_infrastructure_agent(),
            get_monitoring_agent()
        ],
        mode="coordinate",
        model=Claude(id="claude-3-opus-20240229"),
        success_criteria="Task completed successfully with all changes deployed and validated",
        instructions=[
            "Work together to manage Sophia Intel AI",
            "Orchestrator leads and delegates tasks",
            "Developer handles code changes",
            "Infrastructure handles deployments",
            "Monitor validates everything",
            "All changes must be committed and deployed"
        ],
        show_tool_calls=True,
        markdown=True
    )

# Agent factory
def get_agent(agent_type: str) -> Agent:
    """Get specific agent by type"""
    agents = {
        "orchestrator": get_orchestrator_agent,
        "developer": get_development_agent,
        "infrastructure": get_infrastructure_agent,
        "monitor": get_monitoring_agent
    }
    
    if agent_type == "team":
        return get_sophia_team()
    
    agent_func = agents.get(agent_type, get_orchestrator_agent)
    return agent_func()

# Async wrapper for agent execution
async def execute_agent_task(
    agent_type: str,
    task: str,
    context: Optional[Dict] = None
) -> Dict[str, Any]:
    """Execute a task with specified agent"""
    agent = get_agent(agent_type)
    
    # Add context from MCP servers
    if context is None:
        context = {}
    
    # Get current system state
    mcp = MCPTools()
    context["system_state"] = await mcp.memory_query("system_status")
    
    # Execute task
    if hasattr(agent, 'run'):
        response = agent.run(task, context=context)
    else:  # Team
        response = agent.print_response(task, context=context)
    
    # Store result in memory
    await mcp.memory_add(
        f"task_{datetime.utcnow().isoformat()}",
        {
            "task": task,
            "agent": agent_type,
            "response": response.content if hasattr(response, 'content') else str(response),
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    return {
        "content": response.content if hasattr(response, 'content') else str(response),
        "agent": agent_type,
        "timestamp": datetime.utcnow().isoformat()
    }