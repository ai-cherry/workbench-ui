"""Health endpoints and helpers."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

import httpx
from fastapi import APIRouter
from starlette.responses import JSONResponse

from app.core.config import MCP_SERVERS, TESTING

router = APIRouter()


async def collect_health_status() -> Dict[str, Any]:
    """Gather health information about the backend and MCP services."""

    status: Dict[str, Any] = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {},
    }

    if TESTING:
        for service_id, config in MCP_SERVERS.items():
            status["services"][service_id] = {
                "name": config["name"],
                "status": "offline",
                "url": config["url"],
            }
        return status

    async with httpx.AsyncClient(timeout=5.0) as client:
        for service_id, config in MCP_SERVERS.items():
            try:
                response = await client.get(f"{config['url']}/health")
                service_status = "online" if response.status_code == 200 else "degraded"
                status["services"][service_id] = {
                    "name": config["name"],
                    "status": service_status,
                    "url": config["url"],
                }
            except Exception as exc:
                status["services"][service_id] = {
                    "name": config["name"],
                    "status": "offline",
                    "error": str(exc),
                }
    return status


@router.get("/health")
async def health_check() -> JSONResponse:
    """Return the aggregated health payload."""

    return JSONResponse(await collect_health_status())


__all__ = ["collect_health_status", "router"]
