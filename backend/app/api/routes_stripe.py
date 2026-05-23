"""Stripe Checkout + webhook. No-op if STRIPE_SECRET_KEY is unset."""
from __future__ import annotations
import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.auth import User, get_current_user
from app.core.config import settings
from app.core.plans import PLANS
from app.services import plan_store

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/stripe", tags=["stripe"])


# Map your Stripe Price IDs here. Create these in the Stripe dashboard and set them via env later.
# For now we use placeholder IDs — replace before launching real billing.
PLAN_PRICE_IDS = {
    "pro": "price_PRO_REPLACE_ME",
    "lab": "price_LAB_REPLACE_ME",
    "enterprise": "price_ENTERPRISE_REPLACE_ME",
}


class CheckoutSessionRequest(BaseModel):
    plan_id: str  # "pro" | "lab" | "enterprise"


class CheckoutSessionResponse(BaseModel):
    url: str


def _stripe():
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=503,
            detail={
                "type": "stripe_disabled",
                "title": "Billing is not configured on this server (missing STRIPE_SECRET_KEY)",
            },
        )
    import stripe
    stripe.api_key = settings.stripe_secret_key
    return stripe


@router.post("/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    body: CheckoutSessionRequest,
    user: User = Depends(get_current_user),
) -> CheckoutSessionResponse:
    stripe = _stripe()

    plan = PLANS.get(body.plan_id)
    if plan is None or not plan.available:
        raise HTTPException(
            status_code=400,
            detail={"type": "invalid_plan", "title": f"Plan '{body.plan_id}' is not available for purchase"},
        )

    price_id = PLAN_PRICE_IDS.get(body.plan_id)
    if not price_id or price_id.startswith("price_"):
        # placeholder not replaced — fail loudly
        raise HTTPException(
            status_code=503,
            detail={
                "type": "stripe_price_unset",
                "title": f"Stripe price ID for plan '{body.plan_id}' not configured",
            },
        )

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer_email=user.email,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.frontend_url}/?checkout=success",
        cancel_url=f"{settings.frontend_url}/?checkout=cancel",
        client_reference_id=user.id,
        metadata={"user_id": user.id, "plan_id": body.plan_id},
    )
    return CheckoutSessionResponse(url=session.url)


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request):
    """Handles `checkout.session.completed` → set_user_plan; `customer.subscription.deleted` → revert to free."""
    stripe = _stripe()
    if not settings.stripe_webhook_secret:
        raise HTTPException(503, detail={"type": "webhook_secret_unset"})

    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except Exception as exc:
        logger.warning("stripe.webhook.bad_signature", error=str(exc))
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail={"type": "invalid_signature"})

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        user_id = data.get("client_reference_id") or data.get("metadata", {}).get("user_id")
        plan_id = data.get("metadata", {}).get("plan_id")
        if user_id and plan_id:
            await plan_store.set_user_plan(user_id, plan_id)
            logger.info("stripe.plan.upgraded", user_id=user_id, plan_id=plan_id)

    elif event_type == "customer.subscription.deleted":
        user_id = data.get("metadata", {}).get("user_id")
        if user_id:
            await plan_store.set_user_plan(user_id, "free")
            logger.info("stripe.plan.cancelled", user_id=user_id)

    return {"received": True}
