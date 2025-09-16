"""Core configuration helpers for the FastAPI backend."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Mapping, MutableMapping, Set

import yaml
from dotenv import load_dotenv

# Ensure environment variables from .env files are loaded early
load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
CONFIG_PATH = PROJECT_ROOT / "config" / "sophia.config.yaml"


def _load_settings() -> Dict[str, Any]:
    """Load optional Sophia configuration from the repository."""

    if not CONFIG_PATH.exists():
        return {}
    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as handle:
            return yaml.safe_load(handle) or {}
    except Exception:
        return {}


SETTINGS: Dict[str, Any] = _load_settings()
PII_MASK: bool = bool(SETTINGS.get("governance", {}).get("piiMask", False))
SAFE_MODE_DEFAULT: bool = bool(SETTINGS.get("governance", {}).get("safeMode", False))

TESTING: bool = os.getenv("TESTING", "false").lower() in {"1", "true", "yes"}
RESTRICT_MCP_PROXY: bool = os.getenv("RESTRICT_MCP_PROXY", "false").lower() in {
    "1",
    "true",
    "yes",
}
ALLOWED_MCP_PATHS: Mapping[str, Set[str]] = {
    "memory": {"health", "store", "retrieve", "search", "delete"},
    "filesystem": {"health", "read", "write", "list", "delete"},
    "git": {"health", "status", "diff", "log", "symbols"},
    "vector": {"health", "embed", "search", "index", "store", "delete", "stats"},
}

APP_TITLE = "Sophia Intel AI Control Center"
APP_VERSION = "2.0.0"
APP_DESCRIPTION = "Unified control interface for Sophia Intel AI with AgentOS patterns"

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001",
)
ALLOW_CREDENTIALS = os.getenv("ALLOW_CREDENTIALS", "false").lower() in {
    "1",
    "true",
    "yes",
}
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY", "sophia-intel-ai-control-center-key-2025"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "7"))
ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
TOKEN_ISSUER = os.getenv("JWT_ISSUER")
TOKEN_AUDIENCE = os.getenv("JWT_AUDIENCE")

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "ceo")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "payready2025")

MCP_SERVERS: MutableMapping[str, Mapping[str, str]] = {
    "memory": {"url": "http://localhost:8081", "name": "Knowledge Graph Memory"},
    "filesystem": {"url": "http://localhost:8082", "name": "File System Access"},
    "git": {"url": "http://localhost:8084", "name": "Git Repository Control"},
    "vector": {"url": "http://localhost:8085", "name": "Vector Embeddings"},
}


__all__ = [
    "ACCESS_TOKEN_EXPIRE_DAYS",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "ADMIN_PASSWORD",
    "ADMIN_PASSWORD_HASH",
    "ADMIN_USERNAME",
    "ALGORITHM",
    "ALLOW_CREDENTIALS",
    "ALLOWED_MCP_PATHS",
    "ALLOWED_ORIGINS",
    "APP_DESCRIPTION",
    "APP_TITLE",
    "APP_VERSION",
    "CONFIG_PATH",
    "ENVIRONMENT",
    "MCP_SERVERS",
    "PII_MASK",
    "PROJECT_ROOT",
    "RESTRICT_MCP_PROXY",
    "SAFE_MODE_DEFAULT",
    "SECRET_KEY",
    "SETTINGS",
    "TESTING",
    "TOKEN_AUDIENCE",
    "TOKEN_ISSUER",
]
