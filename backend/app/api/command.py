"""Command execution endpoint."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from starlette.responses import JSONResponse

from app.schemas import CommandRequest
from app.security.auth import get_current_user

router = APIRouter()


@router.post("/command")
async def execute_command(
    request: CommandRequest,
    current_user: str = Depends(get_current_user),
) -> JSONResponse:
    """Execute repository commands via the command agent."""

    from app.agents.command_agent import CommandAgent

    agent = CommandAgent()
    result = await agent.execute(
        command=request.command,
        service=request.service,
        args=request.args,
    )
    payload = {
        "status": result.get("status"),
        "output": result.get("output"),
        "error": result.get("error"),
    }
    return JSONResponse(payload)


__all__ = ["router"]
