"""Authentication routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.schemas import LoginRequest, TokenResponse
from app.security.auth import issue_token_response

router = APIRouter()


@router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest) -> TokenResponse:
    """Single admin login endpoint."""

    return issue_token_response(request)


__all__ = ["router"]
