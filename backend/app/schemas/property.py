from __future__ import annotations
from datetime import datetime, UTC
from typing import Optional
from pydantic import BaseModel, Field


class PropertyInput(BaseModel):
    address: str
    suburb: str
    state: str
    postcode: str
    property_type: str = Field(..., description="house | unit | townhouse | land")
    bedrooms: int
    bathrooms: int
    car_spaces: int = 0
    purchase_price: float
    estimated_rent_per_week: float
    loan_amount: Optional[float] = None
    interest_rate: float = 6.5
    loan_term_years: int = 30
    is_new_build: bool = False
    year_built: Optional[int] = None


class RentalYieldResult(BaseModel):
    gross_yield_pct: float
    net_yield_pct: float
    estimated_vacancy_rate_pct: float
    annual_rental_income: float
    market_rent_assessment: str  # below_market | at_market | above_market
    commentary: str


class CashflowResult(BaseModel):
    weekly_rental_income: float
    weekly_mortgage_payment: float
    weekly_expenses: float
    weekly_net_cashflow: float
    annual_net_cashflow: float
    is_positive_cashflow: bool
    break_even_rent: float
    commentary: str


class ROIResult(BaseModel):
    estimated_capital_growth_pct_pa: float
    total_return_pct_pa: float
    equity_in_5_years: float
    projected_value_5_years: float
    payback_period_years: Optional[float]
    commentary: str


class LocationRiskResult(BaseModel):
    suburb_score: int = Field(..., ge=1, le=10)
    flood_risk: str  # low | medium | high
    crime_risk: str  # low | medium | high
    vacancy_risk: str  # low | medium | high
    infrastructure_score: int = Field(..., ge=1, le=10)
    demand_supply_balance: str  # undersupply | balanced | oversupply
    overall_risk_level: str  # low | medium | high
    key_drivers: list[str]
    commentary: str


class InvestmentPotentialResult(BaseModel):
    verdict: str  # BUY | HOLD | AVOID
    confidence: str  # high | medium | low
    overall_score: int = Field(..., ge=1, le=10)
    key_strengths: list[str]
    key_risks: list[str]
    recommendation: str


class PropertyReport(BaseModel):
    property: PropertyInput
    rental_yield: RentalYieldResult
    cashflow: CashflowResult
    roi: ROIResult
    location_risk: LocationRiskResult
    investment_potential: InvestmentPotentialResult
    generated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    tokens_used: int = 0


class AnalyzeRequest(BaseModel):
    property: PropertyInput


class AnalyzeResponse(BaseModel):
    report: PropertyReport
