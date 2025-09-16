"""Deployment endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from starlette.responses import JSONResponse

from app.schemas import DeploymentRequest
from app.security.auth import get_current_user

router = APIRouter()


@router.post("/deploy")
async def deploy_service(
    request: DeploymentRequest,
    current_user: str = Depends(get_current_user),
) -> JSONResponse:
    """Trigger deployment operations via the deployment agent."""

    from app.agents.deployment_agent import DeploymentAgent

    agent = DeploymentAgent()
    result = await agent.deploy(
        target=request.target,
        service=request.service,
        version=request.version,
        rollback=request.rollback,
    )
    payload = {
        "status": result.get("status"),
        "deployment_id": result.get("deployment_id"),
        "url": result.get("url"),
        "logs": result.get("logs", []),
    }
    return JSONResponse(payload)


__all__ = ["router"]
