from __future__ import annotations
from pydantic import BaseModel, Field


class SuburbSearchInput(BaseModel):
    suburb: str
    state: str
    budget_min: float = Field(..., gt=0)
    budget_max: float = Field(..., gt=0)
    investment_goal: str = Field(..., description="capital_growth | cashflow | balanced")


class SuburbSearchResult(BaseModel):
    suburb: str
    state: str
    overall_score: int = Field(..., ge=1, le=10)
    median_house_price: float
    median_unit_price: float
    typical_house_rent_weekly: float
    typical_unit_rent_weekly: float
    typical_gross_yield_pct: float
    recommended_property_types: list[str]  # e.g. ["3br house", "2br unit"]
    target_price_band_min: float
    target_price_band_max: float
    sweet_spot_price: float
    target_pockets: list[str]  # streets/sub-areas to focus on
    growth_drivers: list[str]
    key_risks: list[str]
    demographic_profile: str
    infrastructure_highlights: list[str]
    fit_for_goal: str  # how well this suburb fits the stated goal
    verdict: str  # STRONG_BUY | BUY | WAIT | AVOID
    confidence: str  # high | medium | low
    recommendation: str


class SuburbSearchRequest(BaseModel):
    query: SuburbSearchInput


class SuburbSearchResponse(BaseModel):
    result: SuburbSearchResult
    tokens_used: int = 0
