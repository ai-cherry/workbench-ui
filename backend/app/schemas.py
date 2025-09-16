"""Pydantic schemas for the FastAPI backend."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Message(BaseModel):
    """Chat message exchanged with an agent."""

    role: str = Field(..., description="Message role: user/assistant/system/tool")
    content: str = Field(..., description="Message content")
    metadata: Optional[Dict[str, Any]] = None


class AgentRequest(BaseModel):
    """Request body for executing an agent."""

    messages: List[Message]
    agent: str = Field(default="orchestrator", description="Agent to use")
    stream: bool = Field(default=True, description="Stream response")
    tools: Optional[List[str]] = Field(default=None, description="Tools to enable")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")


class DeploymentRequest(BaseModel):
    """Request body for triggering deployments."""

    target: str = Field(..., description="Deployment target: staging/production")
    service: str = Field(..., description="Service to deploy")
    version: Optional[str] = Field(default="latest", description="Version to deploy")
    rollback: bool = Field(default=False, description="Rollback deployment")


class CommandRequest(BaseModel):
    """Request payload for repository commands."""

    command: str = Field(..., description="Command to execute")
    service: str = Field(..., description="Target service/repository")
    args: Optional[Dict[str, Any]] = None


class LoginRequest(BaseModel):
    """Login credentials for the admin user."""

    username: str
    password: str


class TokenResponse(BaseModel):
    """JWT response body."""

    access_token: str
    token_type: str = "bearer"
