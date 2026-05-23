"""Public model catalogue — id, label, pricing per million tokens."""
from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel

from app.core.plans import HAIKU, MODEL_PRICING_USD_PER_M, OPUS, SONNET

router = APIRouter(prefix="/models", tags=["models"])


class ModelInfo(BaseModel):
    id: str
    label: str
    input_usd_per_m: float
    output_usd_per_m: float


class ModelsResponse(BaseModel):
    models: list[ModelInfo]


_LABELS = {
    HAIKU: "Claude Haiku 4.5 (fast, cheap)",
    SONNET: "Claude Sonnet 4.6 (balanced)",
    OPUS: "Claude Opus 4.7 (most capable)",
}


@router.get("", response_model=ModelsResponse)
async def list_models() -> ModelsResponse:
    return ModelsResponse(
        models=[
            ModelInfo(
                id=mid,
                label=_LABELS.get(mid, mid),
                input_usd_per_m=p["input"],
                output_usd_per_m=p["output"],
            )
            for mid, p in MODEL_PRICING_USD_PER_M.items()
        ]
    )
