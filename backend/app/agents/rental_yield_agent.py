import json
from app.core.base_agent import BaseAgent
from app.schemas.property import PropertyInput, RentalYieldResult


class RentalYieldAgent(BaseAgent):
    name = "rental_yield_agent"

    async def run(self, prop: PropertyInput) -> tuple[RentalYieldResult, int]:
        user_message = json.dumps({
            "address": prop.address,
            "suburb": prop.suburb,
            "state": prop.state,
            "postcode": prop.postcode,
            "property_type": prop.property_type,
            "bedrooms": prop.bedrooms,
            "purchase_price": prop.purchase_price,
            "estimated_rent_per_week": prop.estimated_rent_per_week,
        })
        text, tokens = await self._call_claude(user_message)
        data = self._extract_json(text)
        return RentalYieldResult(**data), tokens
