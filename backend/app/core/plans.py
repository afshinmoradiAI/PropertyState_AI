"""Plan tier definitions + lookups. Single source of truth for limits and model access."""
from __future__ import annotations
from dataclasses import dataclass


@dataclass(frozen=True)
class Plan:
    id: str            # internal id
    label: str
    price_aud: int
    tokens_per_month: int        # hard cap
    generations_per_month: int   # hard cap
    allowed_models: tuple[str, ...]
    default_model: str
    available: bool              # show "Coming Soon" in UI for unavailable
    description: str


HAIKU = "claude-haiku-4-5-20251001"
SONNET = "claude-sonnet-4-6"
OPUS = "claude-opus-4-7"


PLANS: dict[str, Plan] = {
    "free": Plan(
        id="free",
        label="Free",
        price_aud=0,
        tokens_per_month=200_000,
        generations_per_month=5,
        allowed_models=(HAIKU,),
        default_model=HAIKU,
        available=True,
        description="Try the app. Haiku only. 5 analyses / month.",
    ),
    "pro": Plan(
        id="pro",
        label="Pro",
        price_aud=19,
        tokens_per_month=2_000_000,
        generations_per_month=50,
        allowed_models=(HAIKU, SONNET),
        default_model=SONNET,
        available=False,  # Stripe not wired yet
        description="Sonnet + Haiku. 50 analyses / month.",
    ),
    "lab": Plan(
        id="lab",
        label="Lab",
        price_aud=49,
        tokens_per_month=8_000_000,
        generations_per_month=200,
        allowed_models=(HAIKU, SONNET, OPUS),
        default_model=SONNET,
        available=False,
        description="All models incl. Opus. 200 analyses / month.",
    ),
    "enterprise": Plan(
        id="enterprise",
        label="Enterprise",
        price_aud=200,
        tokens_per_month=50_000_000,
        generations_per_month=2000,
        allowed_models=(HAIKU, SONNET, OPUS),
        default_model=OPUS,
        available=False,
        description="High volume, all models, priority support.",
    ),
}


DEFAULT_PLAN_ID = "free"


def get_plan(plan_id: str | None) -> Plan:
    """Return the plan for `plan_id`, falling back to Free if unknown."""
    return PLANS.get(plan_id or DEFAULT_PLAN_ID, PLANS[DEFAULT_PLAN_ID])


# Anthropic pricing per million tokens (input/output) — used by the cost estimator.
# Source: anthropic.com/pricing as of late 2025. Keep in sync with model availability.
MODEL_PRICING_USD_PER_M: dict[str, dict[str, float]] = {
    HAIKU:  {"input": 1.00,  "output": 5.00},
    SONNET: {"input": 3.00,  "output": 15.00},
    OPUS:   {"input": 15.00, "output": 75.00},
}
