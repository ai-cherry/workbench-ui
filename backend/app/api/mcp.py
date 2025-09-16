"""MCP proxy endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from starlette.responses import JSONResponse
import httpx
from urllib.parse import unquote

from app.core.config import ALLOWED_MCP_PATHS, MCP_SERVERS, RESTRICT_MCP_PROXY
from app.security.auth import get_current_user

router = APIRouter()


def _ensure_service(service: str) -> None:
    if service not in MCP_SERVERS:
        raise HTTPException(status_code=404, detail=f"Service {service} not found")


def _validate_path(service: str, path: str) -> None:
    if not path:
        raise HTTPException(status_code=400, detail="Invalid path")
    if ".." in path or path.startswith("http") or path.startswith("//"):
        raise HTTPException(status_code=400, detail="Invalid path")
    if RESTRICT_MCP_PROXY:
        first = path.split("?")[0].lstrip("/").split("/", 1)[0]
        allowed = ALLOWED_MCP_PATHS.get(service, set())
        if first and first not in allowed:
            raise HTTPException(status_code=403, detail="Endpoint not allowed")


def _guard_traversal(request: Request) -> None:
    raw_path = request.scope.get("raw_path")
    if isinstance(raw_path, (bytes, bytearray)):
        candidate = raw_path.decode("utf-8", errors="ignore")
    else:
        candidate = request.url.path
    decoded = unquote(candidate)
    segments = decoded.split("/")
    if any(segment == ".." for segment in segments):
        raise HTTPException(status_code=400, detail="Invalid path")


@router.get("/mcp/{service}/{path:path}")
async def proxy_mcp_request(
    service: str,
    path: str,
    request: Request,
    current_user: str = Depends(get_current_user),
) -> JSONResponse:
    """Proxy GET requests to MCP servers."""

    _guard_traversal(request)
    _validate_path(service, path)
    _ensure_service(service)

    async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
        try:
            response = await client.get(f"{MCP_SERVERS[service]['url']}/{path}")
            return JSONResponse(response.json(), status_code=response.status_code)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/mcp/{service}/{path:path}")
async def proxy_mcp_post(
    service: str,
    path: str,
    body: dict,
    request: Request,
    current_user: str = Depends(get_current_user),
) -> JSONResponse:
    """Proxy POST requests to MCP servers."""

    _guard_traversal(request)
    _validate_path(service, path)
    _ensure_service(service)

    async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
        try:
            response = await client.post(
                f"{MCP_SERVERS[service]['url']}/{path}",
                json=body,
            )
            return JSONResponse(response.json(), status_code=response.status_code)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


__all__ = ["router"]
