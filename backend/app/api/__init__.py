"""Route registration helpers."""
from __future__ import annotations

from fastapi import FastAPI

from . import agent, auth, command, deploy, health, mcp, websocket, workflows

ROUTERS = (
    auth.router,
    health.router,
    workflows.router,
    agent.router,
    deploy.router,
    command.router,
    mcp.router,
    websocket.router,
)


def register_routes(app: FastAPI) -> None:
    """Attach all API routers to the FastAPI application."""

    for router in ROUTERS:
        app.include_router(router)


__all__ = ["register_routes"]
