import json
from app.core.base_agent import BaseAgent
from app.schemas.property import PropertyInput, CashflowResult


class CashflowAgent(BaseAgent):
    name = "cashflow_agent"

    async def run(self, prop: PropertyInput) -> tuple[CashflowResult, int]:
        user_message = json.dumps({
            "property_type": prop.property_type,
            "purchase_price": prop.purchase_price,
            "estimated_rent_per_week": prop.estimated_rent_per_week,
            "loan_amount": prop.loan_amount,
            "interest_rate": prop.interest_rate,
            "loan_term_years": prop.loan_term_years,
        })
        text, tokens = await self._call_claude(user_message)
        data = self._extract_json(text)
        return CashflowResult(**data), tokens
