import pytest
from unittest.mock import AsyncMock, patch
from app.agents.rental_yield_agent import RentalYieldAgent
from app.schemas.property import PropertyInput, RentalYieldResult

MOCK_RESPONSE = """
```json
{
  "gross_yield_pct": 4.55,
  "net_yield_pct": 3.05,
  "estimated_vacancy_rate_pct": 2.5,
  "annual_rental_income": 36400,
  "market_rent_assessment": "at_market",
  "commentary": "Solid yield for the area."
}
```
"""

SAMPLE_PROPERTY = PropertyInput(
    address="12 Test St, Parramatta NSW 2150",
    suburb="Parramatta",
    state="NSW",
    postcode="2150",
    property_type="house",
    bedrooms=3,
    bathrooms=2,
    car_spaces=1,
    purchase_price=800000,
    estimated_rent_per_week=700,
    interest_rate=6.5,
    loan_term_years=30,
)


@pytest.mark.asyncio
async def test_rental_yield_agent_returns_valid_model():
    agent = RentalYieldAgent()
    with patch.object(agent, "_call_claude", new=AsyncMock(return_value=(MOCK_RESPONSE, 500))):
        result, tokens = await agent.run(SAMPLE_PROPERTY)

    assert isinstance(result, RentalYieldResult)
    assert abs(result.gross_yield_pct - 4.55) < 0.01
    assert result.net_yield_pct < result.gross_yield_pct
    assert tokens == 500
