"""Google OAuth — exchanges authorization code for ID token, signs in / creates user.

Frontend redirects user to /api/oauth/google/login, which redirects to Google.
Google redirects back to /api/oauth/google/callback?code=... — we exchange the code
for an ID token, extract the email, find-or-create the user, and redirect to the
frontend with a session token in the URL fragment.
"""
from __future__ import annotations
import secrets
import structlog
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from jose import jwt as jose_jwt

from app.core.auth import (
    create_access_token,
    create_user,
    get_user_by_email,
)
from app.core.config import settings

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/oauth", tags=["oauth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


def _check_google_configured():
    if not settings.google_oauth_client_id or not settings.google_oauth_client_secret:
        raise HTTPException(
            503,
            detail={
                "type": "oauth_disabled",
                "title": "Google OAuth is not configured on this server",
            },
        )


@router.get("/google/login")
async def google_login(request: Request):
    _check_google_configured()
    state = secrets.token_urlsafe(16)
    redirect_uri = str(request.url_for("google_callback"))
    qs = urlencode({
        "client_id": settings.google_oauth_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    })
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{qs}")


@router.get("/google/callback", name="google_callback")
async def google_callback(request: Request, code: str | None = None, error: str | None = None):
    _check_google_configured()
    if error or not code:
        return RedirectResponse(f"{settings.frontend_url}/sign-in?oauth_error={error or 'no_code'}")

    redirect_uri = str(request.url_for("google_callback"))
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_oauth_client_id,
                "client_secret": settings.google_oauth_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if res.status_code != 200:
            logger.warning("oauth.google.token_exchange_failed", status=res.status_code, body=res.text[:300])
            return RedirectResponse(f"{settings.frontend_url}/sign-in?oauth_error=token_exchange")
        tokens = res.json()

    id_token = tokens.get("id_token")
    if not id_token:
        return RedirectResponse(f"{settings.frontend_url}/sign-in?oauth_error=no_id_token")

    # Decode without verification — we just got it from Google over TLS using our own secret.
    # For higher assurance, verify against Google's JWKS.
    claims = jose_jwt.get_unverified_claims(id_token)
    email = claims.get("email")
    if not email:
        return RedirectResponse(f"{settings.frontend_url}/sign-in?oauth_error=no_email")

    user = await get_user_by_email(email)
    if user is None:
        # Create a user with a long random password (they'll never use it; OAuth only).
        random_pw = secrets.token_urlsafe(32)
        user = await create_user(email, random_pw)

    access_token = create_access_token(user.id)
    # Send the token via URL fragment (#) so it doesn't appear in server logs.
    return RedirectResponse(f"{settings.frontend_url}/oauth-complete#token={access_token}")
