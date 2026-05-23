export interface SuburbSearchInput {
  suburb: string
  state: string
  budget_min: number
  budget_max: number
  investment_goal: 'capital_growth' | 'cashflow' | 'balanced'
}

export interface SuburbSearchResult {
  suburb: string
  state: string
  overall_score: number
  median_house_price: number
  median_unit_price: number
  typical_house_rent_weekly: number
  typical_unit_rent_weekly: number
  typical_gross_yield_pct: number
  recommended_property_types: string[]
  target_price_band_min: number
  target_price_band_max: number
  sweet_spot_price: number
  target_pockets: string[]
  growth_drivers: string[]
  key_risks: string[]
  demographic_profile: string
  infrastructure_highlights: string[]
  fit_for_goal: string
  verdict: 'STRONG_BUY' | 'BUY' | 'WAIT' | 'AVOID' | string
  confidence: 'high' | 'medium' | 'low' | string
  recommendation: string
}

export interface SuburbSearchResponse {
  result: SuburbSearchResult
  tokens_used: number
}
