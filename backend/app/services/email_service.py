"""Email sending — pluggable provider.

In development (`EMAIL_PROVIDER=console`), emails are logged to stdout — no real send.
In production set `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` and emails go via Resend.

Add new providers (SendGrid, SES, Postmark) by extending `_send_*` below.
"""
from __future__ import annotations
import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


async def send_email(*, to: str, subject: str, html: str, text: str | None = None) -> bool:
    """Send an email. Returns True on success (or simulated success in console mode)."""
    provider = settings.email_provider.lower()

    if provider == "console":
        logger.info("email.console", to=to, subject=subject, body_preview=(text or html)[:200])
        return True

    if provider == "resend":
        if not settings.resend_api_key:
            logger.warning("email.resend.no_key", to=to)
            return False
        return await _send_resend(to=to, subject=subject, html=html, text=text)

    logger.error("email.unknown_provider", provider=provider)
    return False


async def _send_resend(*, to: str, subject: str, html: str, text: str | None) -> bool:
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            res = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.email_from,
                    "to": [to],
                    "subject": subject,
                    "html": html,
                    **({"text": text} if text else {}),
                },
            )
            if res.status_code >= 400:
                logger.error("email.resend.failed", status=res.status_code, body=res.text[:300])
                return False
            logger.info("email.resend.sent", to=to, subject=subject)
            return True
        except Exception as exc:
            logger.exception("email.resend.exception", to=to, error=str(exc))
            return False
