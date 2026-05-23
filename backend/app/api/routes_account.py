"""Account management — GDPR data export + account deletion."""
from __future__ import annotations
from dataclasses import asdict
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.auth import User, get_current_user
from app.core.db import connect
from app.services import plan_store, report_store

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/account", tags=["account"])


class AccountDeleteResponse(BaseModel):
    deleted: bool


@router.get("/export")
async def export_my_data(user: User = Depends(get_current_user)) -> JSONResponse:
    """GDPR Article 20 — full export of everything we hold for this user."""
    reports = await report_store.list_reports(user_id=user.id, limit=1000)
    plan = await plan_store.get_user_plan(user.id)
    usage = await plan_store.get_usage(user.id)

    payload = {
        "user": {
            "id": user.id,
            "email": user.email,
            "created_at": user.created_at,
        },
        "plan": plan.label,
        "current_period_usage": {
            "tokens_used": usage.tokens_used,
            "generations": usage.generations,
        },
        "reports": [asdict(r) for r in reports],
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }
    headers = {
        "Content-Disposition": f"attachment; filename=propertystate-export-{user.id[:8]}.json"
    }
    return JSONResponse(content=payload, headers=headers)


@router.delete("/me", response_model=AccountDeleteResponse)
async def delete_my_account(user: User = Depends(get_current_user)) -> AccountDeleteResponse:
    """Delete the current user — cascades to reports, user_plans, and monthly_usage."""
    async with connect() as db:
        await db.execute("DELETE FROM users WHERE id = ?", (user.id,))
        await db.commit()
    logger.info("account.deleted", user_id=user.id, email=user.email)
    return AccountDeleteResponse(deleted=True)
