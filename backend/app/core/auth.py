"""JWT + bcrypt auth primitives and FastAPI dependencies."""
from __future__ import annotations
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import bcrypt
import structlog
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.core.db import connect

logger = structlog.get_logger(__name__)

_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


@dataclass
class User:
    id: str
    email: str
    created_at: str


def hash_password(plain: str) -> str:
    # bcrypt has a hard 72-byte limit on input. We pre-truncate at the byte level
    # so callers don't have to think about it. Passwords longer than 72 bytes are
    # vanishingly rare and the truncation is still cryptographically secure.
    pw_bytes = plain.encode("utf-8")[:72]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        pw_bytes = plain.encode("utf-8")[:72]
        return bcrypt.checkpw(pw_bytes, hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> str | None:
    """Return user_id if token is valid, else None."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload.get("sub")
    except JWTError:
        return None


async def create_user(email: str, password: str) -> User:
    user_id = uuid.uuid4().hex
    pw_hash = hash_password(password)
    async with connect() as db:
        await db.execute(
            "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
            (user_id, email.lower().strip(), pw_hash),
        )
        await db.commit()
        cursor = await db.execute(
            "SELECT id, email, created_at FROM users WHERE id = ?", (user_id,)
        )
        row = await cursor.fetchone()
    logger.info("auth.user.created", user_id=user_id, email=email)
    return User(**dict(row))


async def authenticate_user(email: str, password: str) -> User | None:
    async with connect() as db:
        cursor = await db.execute(
            "SELECT id, email, password_hash, created_at FROM users WHERE email = ?",
            (email.lower().strip(),),
        )
        row = await cursor.fetchone()
    if row is None:
        return None
    if not verify_password(password, row["password_hash"]):
        return None
    return User(id=row["id"], email=row["email"], created_at=row["created_at"])


async def get_user_by_email(email: str) -> User | None:
    async with connect() as db:
        cursor = await db.execute(
            "SELECT id, email, created_at FROM users WHERE email = ?",
            (email.lower().strip(),),
        )
        row = await cursor.fetchone()
    return User(**dict(row)) if row else None


# ---- Password reset ----

PASSWORD_RESET_TTL_MINUTES = 30


async def create_password_reset(user_id: str) -> str:
    """Generate a one-shot password-reset token. Caller is responsible for emailing it."""
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_TTL_MINUTES)).isoformat()
    async with connect() as db:
        await db.execute(
            "INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires),
        )
        await db.commit()
    return token


async def consume_password_reset(token: str, new_password: str) -> bool:
    """Validate the token, mark it used, and update the user's password. Returns True on success."""
    async with connect() as db:
        cursor = await db.execute(
            "SELECT user_id, expires_at, used FROM password_resets WHERE token = ?",
            (token,),
        )
        row = await cursor.fetchone()
        if not row or row["used"]:
            return False
        if datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc):
            return False

        await db.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(new_password), row["user_id"]),
        )
        await db.execute("UPDATE password_resets SET used = 1 WHERE token = ?", (token,))
        await db.commit()
    logger.info("auth.password_reset.consumed", user_id=row["user_id"])
    return True


async def get_user_by_id(user_id: str) -> User | None:
    async with connect() as db:
        cursor = await db.execute(
            "SELECT id, email, created_at FROM users WHERE id = ?", (user_id,)
        )
        row = await cursor.fetchone()
    return User(**dict(row)) if row else None


# --- FastAPI dependencies ---

async def get_current_user(
    request: Request,
    token: str | None = Depends(_oauth2),
) -> User:
    """Required auth — 401 if missing/invalid."""
    if token is None:
        # Also accept Authorization: Bearer manually (some clients omit OAuth2 form)
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1]
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"type": "unauthorized", "title": "Missing or invalid token"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"type": "unauthorized", "title": "Invalid or expired token"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"type": "unauthorized", "title": "User no longer exists"},
        )
    return user


async def get_current_user_optional(
    request: Request,
    token: str | None = Depends(_oauth2),
) -> User | None:
    """Optional auth — None if missing/invalid. Used for endpoints that work for both anon + signed-in users."""
    if token is None:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1]
    if not token:
        return None
    user_id = decode_token(token)
    if not user_id:
        return None
    return await get_user_by_id(user_id)
