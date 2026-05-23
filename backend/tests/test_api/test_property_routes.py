import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas.property import PropertyReport, PropertyInput, RentalYieldResult, CashflowResult, ROIResult, LocationRiskResult, TaxDepreciationResult, InvestmentPotentialResult, NegotiationResult
from datetime import datetime

SAMPLE_PAYLOAD = {
    "property": {
        "address": "12 Test St",
        "suburb": "Parramatta",
        "state": "NSW",
        "postcode": "2150",
        "property_type": "house",
        "bedrooms": 3,
        "bathrooms": 2,
        "car_spaces": 1,
        "purchase_price": 800000,
        "estimated_rent_per_week": 700,
        "loan_amount": None,
        "interest_rate": 6.5,
        "loan_term_years": 30,
        "is_new_build": False,
        "year_built": None,
    }
}

MOCK_REPORT = PropertyReport(
    property=PropertyInput(**SAMPLE_PAYLOAD["property"]),
    rental_yield=RentalYieldResult(
        gross_yield_pct=4.55, net_yield_pct=3.05, estimated_vacancy_rate_pct=2.5,
        annual_rental_income=36400, market_rent_assessment="at_market",
        commentary="Good yield."
    ),
    cashflow=CashflowResult(
        weekly_rental_income=700, weekly_mortgage_payment=1050, weekly_expenses=180,
        weekly_net_cashflow=-530, annual_net_cashflow=-27560, is_positive_cashflow=False,
        break_even_rent=1230, commentary="Negatively geared."
    ),
    roi=ROIResult(
        estimated_capital_growth_pct_pa=5.5, total_return_pct_pa=8.55,
        equity_in_5_years=450000, projected_value_5_years=1044000,
        payback_period_years=None, commentary="Strong capital growth."
    ),
    location_risk=LocationRiskResult(
        suburb_score=7, flood_risk="low", crime_risk="medium", vacancy_risk="low",
        infrastructure_score=8, demand_supply_balance="undersupply",
        overall_risk_level="medium", key_drivers=["Transport", "Schools", "Employment"],
        commentary="Good suburb."
    ),
    tax_depreciation=TaxDepreciationResult(
        marginal_tax_rate_pct=37.0,
        annual_depreciation_total=11000.0,
        division_40_depreciation=5000.0,
        division_43_depreciation=6000.0,
        annual_tax_deductible_loss=15000.0,
        estimated_annual_tax_benefit=5550.0,
        after_tax_weekly_cashflow=-423.0,
        is_negatively_geared=True,
        commentary="Solid depreciation for a new build.",
    ),
    investment_potential=InvestmentPotentialResult(
        verdict="BUY", confidence="medium", overall_score=7,
        key_strengths=["Good yield", "Infrastructure"], key_risks=["Negative cashflow"],
        recommendation="Buy and hold for capital growth."
    ),
    negotiation=NegotiationResult(
        asking_price=800000,
        recommended_max_offer=760000,
        suggested_opening_offer=730000,
        walk_away_price=775000,
        estimated_savings_potential=40000,
        market_position="balanced",
        negotiation_levers=["Price", "Settlement period", "Inclusions"],
        confidence="medium",
        strategy="Offer 730k, settle around 760k. Push for 8-week settlement and white goods.",
    ),
    tokens_used=2000,
)


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_analyze_returns_report(tmp_path, monkeypatch):
    # Point the DB at a temp file so persistence works in tests
    from app.core import db
    from app.core.config import settings
    monkeypatch.setattr(settings, "data_dir", str(tmp_path))
    await db.init_db()

    with patch("app.api.routes_property._orchestrator.analyze", new=AsyncMock(return_value=MOCK_REPORT)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.post("/api/property/analyze", json=SAMPLE_PAYLOAD)

    assert r.status_code == 200
    body = r.json()
    assert body["report"]["investment_potential"]["verdict"] == "BUY"
    assert body["report_id"] and len(body["report_id"]) == 32
