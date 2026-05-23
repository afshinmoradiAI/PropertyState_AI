"""Auth routes — register, login, me, refresh."""
from __future__ import annotations
import structlog
import sqlite3
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import (
    User,
    authenticate_user,
    consume_password_reset,
    create_access_token,
    create_password_reset,
    create_user,
    get_current_user,
    get_user_by_email,
)
from app.core.config import settings
from app.schemas.auth import (
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.email_service import send_email

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest) -> TokenResponse:
    try:
        user = await create_user(body.email, body.password)
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"type": "email_taken", "title": "Email already registered"},
        )
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest) -> TokenResponse:
    user = await authenticate_user(body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"type": "invalid_credentials", "title": "Email or password is incorrect"},
        )
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=user.id, email=user.email, created_at=user.created_at)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(user: User = Depends(get_current_user)) -> TokenResponse:
    """Issue a fresh token for the currently authenticated user."""
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/password-reset/request", status_code=202)
async def request_password_reset(body: PasswordResetRequest):
    """Always returns 202 — never reveals whether the email exists (anti-enumeration)."""
    user = await get_user_by_email(body.email)
    if user:
        token = await create_password_reset(user.id)
        reset_url = f"{settings.frontend_url}/reset-password?token={token}"
        await send_email(
            to=user.email,
            subject="Reset your PropertyState AI password",
            html=f"""
                <p>Hi,</p>
                <p>Someone (hopefully you) requested a password reset for your PropertyState AI account.</p>
                <p><a href="{reset_url}">Click here to set a new password</a></p>
                <p>This link expires in 30 minutes. If you didn't request this, ignore this email.</p>
            """,
            text=f"Reset your password: {reset_url} (expires in 30 minutes)",
        )
    return {"status": "ok"}


@router.post("/password-reset/confirm", response_model=TokenResponse)
async def confirm_password_reset(body: PasswordResetConfirm) -> TokenResponse:
    ok = await consume_password_reset(body.token, body.new_password)
    if not ok:
        raise HTTPException(
            status_code=400,
            detail={"type": "invalid_token", "title": "Reset link is invalid or expired"},
        )
    # Find the user and issue a fresh access token so they're signed in
    from app.core.db import connect
    async with connect() as db:
        cursor = await db.execute(
            "SELECT user_id FROM password_resets WHERE token = ?", (body.token,)
        )
        row = await cursor.fetchone()
    return TokenResponse(access_token=create_access_token(row["user_id"]))
