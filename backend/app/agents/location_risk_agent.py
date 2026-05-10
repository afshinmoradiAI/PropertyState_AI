import json
from app.core.base_agent import BaseAgent
from app.schemas.property import PropertyInput, LocationRiskResult


class LocationRiskAgent(BaseAgent):
    name = "location_risk_agent"

    async def run(self, prop: PropertyInput) -> tuple[LocationRiskResult, int]:
        user_message = json.dumps({
            "address": prop.address,
            "suburb": prop.suburb,
            "state": prop.state,
            "postcode": prop.postcode,
            "property_type": prop.property_type,
            "bedrooms": prop.bedrooms,
        })
        text, tokens = await self._call_claude(user_message)
        data = self._extract_json(text)
        return LocationRiskResult(**data), tokens
