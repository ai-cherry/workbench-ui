"""Authentication helpers and dependencies."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import (
    ACCESS_TOKEN_EXPIRE_DAYS,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ADMIN_PASSWORD,
    ADMIN_PASSWORD_HASH,
    ADMIN_USERNAME,
    ALGORITHM,
    ENVIRONMENT,
    SECRET_KEY,
    TOKEN_AUDIENCE,
    TOKEN_ISSUER,
)
from app.schemas import LoginRequest, TokenResponse

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

if ENVIRONMENT == "production" and SECRET_KEY == "sophia-intel-ai-control-center-key-2025":
    raise RuntimeError("JWT_SECRET_KEY must be set in production")


def _admin_password_hash() -> str:
    """Return the hashed admin password, hashing ENV secret if needed."""

    if ADMIN_PASSWORD_HASH:
        return ADMIN_PASSWORD_HASH
    if ENVIRONMENT == "production" and ADMIN_PASSWORD == "payready2025":
        raise RuntimeError("ADMIN_PASSWORD must be set in production")
    return pwd_context.hash(ADMIN_PASSWORD)


_ADMIN_PASSWORD_HASH = _admin_password_hash()


def create_access_token(data: Dict[str, Any]) -> str:
    """Generate a signed JWT for the admin user."""

    to_encode = data.copy()
    if ACCESS_TOKEN_EXPIRE_MINUTES and ACCESS_TOKEN_EXPIRE_MINUTES.isdigit():
        expire = datetime.utcnow() + timedelta(minutes=int(ACCESS_TOKEN_EXPIRE_MINUTES))
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)

    to_encode.update({"exp": expire})
    if TOKEN_ISSUER:
        to_encode["iss"] = TOKEN_ISSUER
    if TOKEN_AUDIENCE:
        to_encode["aud"] = TOKEN_AUDIENCE

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def authenticate_admin(username: str, password: str) -> bool:
    """Validate admin credentials."""

    return username == ADMIN_USERNAME and pwd_context.verify(password, _ADMIN_PASSWORD_HASH)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Dependency that verifies the JWT and returns the username."""

    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication") from exc

    username = payload.get("sub")
    if username != ADMIN_USERNAME:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return username


def issue_token_response(request: LoginRequest) -> TokenResponse:
    """Validate credentials and return a token response."""

    if not authenticate_admin(request.username, request.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token({"sub": request.username})
    return TokenResponse(access_token=access_token)


__all__ = [
    "ADMIN_USERNAME",
    "authenticate_admin",
    "create_access_token",
    "get_current_user",
    "issue_token_response",
    "security",
]
