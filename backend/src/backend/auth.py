"""
Authentication: password hashing, JWT issuance/verification, and the
get_current_user dependency used to scope every route to its owner.
"""

import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from . import models
from .database import get_db

# Fail fast at import time, mirroring database.py's DATABASE_URL check — a
# misconfigured deploy should refuse to boot rather than mint insecure tokens.
JWT_SECRET = os.getenv("JWT_SECRET")
if JWT_SECRET is None:
    raise ValueError("🚨 JWT_SECRET is not defined")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days — no refresh-token flow needed

password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_password(password: str) -> str:
    """Hash a plaintext password for storage."""
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plaintext password against its stored hash."""
    return password_hash.verify(plain_password, hashed_password)


def get_allowed_usernames() -> set[str]:
    """Parse the ALLOWED_USERNAMES env var into a set of permitted usernames."""
    raw = os.getenv("ALLOWED_USERNAMES", "")
    return {name.strip() for name in raw.split(",") if name.strip()}


def create_access_token(data: dict) -> str:
    """Encode a JWT carrying `data` plus an expiry claim."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    """Resolve the authenticated User from the Bearer token.

    Raises 401 on any failure (missing/invalid/expired token, unknown user)
    via a single path — never distinguish the cause in the response.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user
