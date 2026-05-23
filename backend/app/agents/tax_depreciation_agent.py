import json
from app.core.base_agent import BaseAgent
from app.schemas.property import PropertyInput, TaxDepreciationResult


class TaxDepreciationAgent(BaseAgent):
    name = "tax_depreciation_agent"

    async def run(self, prop: PropertyInput) -> tuple[TaxDepreciationResult, int]:
        user_message = json.dumps({
            "property_type": prop.property_type,
            "purchase_price": prop.purchase_price,
            "estimated_rent_per_week": prop.estimated_rent_per_week,
            "loan_amount": prop.loan_amount,
            "interest_rate": prop.interest_rate,
            "loan_term_years": prop.loan_term_years,
            "is_new_build": prop.is_new_build,
            "year_built": prop.year_built,
        })
        text, tokens = await self._call_claude(user_message)
        data = self._extract_json(text)
        return TaxDepreciationResult(**data), tokens
