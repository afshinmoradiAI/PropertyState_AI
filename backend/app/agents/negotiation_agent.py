import json
from app.core.base_agent import BaseAgent
from app.schemas.property import (
    PropertyInput,
    CashflowResult,
    ROIResult,
    LocationRiskResult,
    NegotiationResult,
)


class NegotiationAgent(BaseAgent):
    name = "negotiation_agent"

    async def run(  # type: ignore[override]
        self,
        prop: PropertyInput,
        cashflow: CashflowResult,
        roi: ROIResult,
        location_risk: LocationRiskResult,
    ) -> tuple[NegotiationResult, int]:
        user_message = json.dumps({
            "property": prop.model_dump(),
            "cashflow": cashflow.model_dump(),
            "roi": roi.model_dump(),
            "location_risk": location_risk.model_dump(),
        })
        text, tokens = await self._call_claude(user_message)
        data = self._extract_json(text)
        return NegotiationResult(**data), tokens
