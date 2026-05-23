"""Billing + plan introspection routes."""
from __future__ import annotations
from dataclasses import asdict

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.auth import User, get_current_user
from app.core.plans import PLANS, Plan
from app.services import plan_store

router = APIRouter(prefix="/billing", tags=["billing"])


class PlanOut(BaseModel):
    id: str
    label: str
    price_aud: int
    tokens_per_month: int
    generations_per_month: int
    allowed_models: list[str]
    default_model: str
    available: bool
    description: str


class PlansResponse(BaseModel):
    plans: list[PlanOut]


class UsageResponse(BaseModel):
    plan: PlanOut
    period: str
    tokens_used: int
    tokens_limit: int
    generations_used: int
    generations_limit: int


def _to_out(p: Plan) -> PlanOut:
    return PlanOut(
        id=p.id, label=p.label, price_aud=p.price_aud,
        tokens_per_month=p.tokens_per_month,
        generations_per_month=p.generations_per_month,
        allowed_models=list(p.allowed_models),
        default_model=p.default_model,
        available=p.available,
        description=p.description,
    )


@router.get("/plans", response_model=PlansResponse)
async def list_plans() -> PlansResponse:
    """All plans — public. UI shows 'Coming Soon' for `available=false`."""
    return PlansResponse(plans=[_to_out(p) for p in PLANS.values()])


@router.get("/usage", response_model=UsageResponse)
async def my_usage(user: User = Depends(get_current_user)) -> UsageResponse:
    plan = await plan_store.get_user_plan(user.id)
    usage = await plan_store.get_usage(user.id)
    return UsageResponse(
        plan=_to_out(plan),
        period=plan_store.current_period(),
        tokens_used=usage.tokens_used,
        tokens_limit=plan.tokens_per_month,
        generations_used=usage.generations,
        generations_limit=plan.generations_per_month,
    )
