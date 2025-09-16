"""Sophia Intel AI Control Center FastAPI application."""
from __future__ import annotations

from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import register_routes
from app.api.graphql import router as graphql_router
from app.core.config import (
    ADMIN_USERNAME,
    ALLOW_CREDENTIALS,
    ALLOWED_ORIGINS,
    APP_DESCRIPTION,
    APP_TITLE,
    APP_VERSION,
    MCP_SERVERS,
)
from app.security.auth import ADMIN_USERNAME as ADMIN_USER, create_access_token as _create_access_token

app = FastAPI(title=APP_TITLE, version=APP_VERSION, description=APP_DESCRIPTION)


def _parse_origins(value: str) -> List[str]:
    return [origin.strip() for origin in value.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_origins(ALLOWED_ORIGINS),
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_routes(app)
app.include_router(graphql_router, prefix="/graphql")


@app.on_event("startup")
async def startup_event() -> None:
    """Log startup information for operators."""

    print("🚀 Sophia Intel AI Control Center starting...")
    print(f"📡 MCP Servers configured: {list(MCP_SERVERS.keys())}")
    print(f"🔐 Auth enabled for user: {ADMIN_USERNAME}")
    print("✅ System ready at http://localhost:8000")


# Re-export commonly used authentication helpers for tests and tooling
create_access_token = _create_access_token
ADMIN_USERNAME = ADMIN_USER


__all__ = ["ADMIN_USERNAME", "app", "create_access_token"]


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
