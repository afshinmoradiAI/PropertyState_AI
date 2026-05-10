import json
from app.core.base_agent import BaseAgent
from app.schemas.property import PropertyInput, ROIResult


class ROIAgent(BaseAgent):
    name = "roi_agent"

    async def run(self, prop: PropertyInput) -> tuple[ROIResult, int]:
        user_message = json.dumps({
            "suburb": prop.suburb,
            "state": prop.state,
            "property_type": prop.property_type,
            "purchase_price": prop.purchase_price,
            "loan_amount": prop.loan_amount,
            "interest_rate": prop.interest_rate,
            "loan_term_years": prop.loan_term_years,
            "estimated_rent_per_week": prop.estimated_rent_per_week,
            "is_new_build": prop.is_new_build,
            "year_built": prop.year_built,
        })
        text, tokens = await self._call_claude(user_message)
        data = self._extract_json(text)
        return ROIResult(**data), tokens
