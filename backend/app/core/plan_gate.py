"""Plan-gate: checks the current user is under their monthly limits before running an analysis.

Raises HTTP 402 (Payment Required) with RFC 7807 body if the user is over their plan's
token or generation cap. Anonymous users are allowed (but limited by IP rate limit).

Also resolves which model the agents should use, honouring `X-Model` header but pinning
to the plan's allowed_models. Sets a ContextVar that BaseAgent reads.
"""
from __future__ import annotations
import contextvars

from fastapi import Depends, HTTPException, Request, status

from app.core.auth import User, get_current_user_optional
from app.core.config import settings
from app.core.plans import Plan, get_plan
from app.services import plan_store


# ContextVar carrying the active model for this request (per-request override).
# BaseAgent will read it via get_active_model(); falls back to settings.default_model.
_active_model: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "active_model", default=None
)


def set_active_model(model: str | None) -> None:
    _active_model.set(model)


def get_active_model() -> str:
    return _active_model.get() or settings.default_model


async def plan_gate(
    request: Request,
    user: User | None = Depends(get_current_user_optional),
) -> User | None:
    """Pre-run check: caps + model resolution. Returns the user (or None for anon)."""
    if user is None:
        # Anonymous users: no plan, no limits beyond IP rate limit.
        # Use the default model.
        set_active_model(settings.default_model)
        return None

    plan = await plan_store.get_user_plan(user.id)
    usage = await plan_store.get_usage(user.id)

    if usage.tokens_used >= plan.tokens_per_month:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "type": "plan_limit_tokens",
                "title": f"Monthly token limit reached for plan '{plan.label}'",
                "limit": plan.tokens_per_month,
                "used": usage.tokens_used,
            },
        )
    if usage.generations >= plan.generations_per_month:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "type": "plan_limit_generations",
                "title": f"Monthly analysis limit reached for plan '{plan.label}'",
                "limit": plan.generations_per_month,
                "used": usage.generations,
            },
        )

    # Resolve model — user-requested header, pinned to plan's allowed_models
    requested = request.headers.get("x-model")
    if requested and requested in plan.allowed_models:
        model = requested
    else:
        model = plan.default_model
    set_active_model(model)

    return user


def get_user_plan(user: User) -> Plan:
    """Sync helper used by routes that need the plan inline."""
    import asyncio
    return asyncio.run(plan_store.get_user_plan(user.id))
