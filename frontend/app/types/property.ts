export interface PropertyInput {
  address: string
  suburb: string
  state: string
  postcode: string
  property_type: string
  bedrooms: number
  bathrooms: number
  car_spaces: number
  purchase_price: number
  estimated_rent_per_week: number
  loan_amount: number | null
  interest_rate: number
  loan_term_years: number
  is_new_build: boolean
  year_built: number | null
}

export interface RentalYieldResult {
  gross_yield_pct: number
  net_yield_pct: number
  estimated_vacancy_rate_pct: number
  annual_rental_income: number
  market_rent_assessment: string
  commentary: string
}

export interface CashflowResult {
  weekly_rental_income: number
  weekly_mortgage_payment: number
  weekly_expenses: number
  weekly_net_cashflow: number
  annual_net_cashflow: number
  is_positive_cashflow: boolean
  break_even_rent: number
  commentary: string
}

export interface ROIResult {
  estimated_capital_growth_pct_pa: number
  total_return_pct_pa: number
  equity_in_5_years: number
  projected_value_5_years: number
  payback_period_years: number | null
  commentary: string
}

export interface LocationRiskResult {
  suburb_score: number
  flood_risk: string
  crime_risk: string
  vacancy_risk: string
  infrastructure_score: number
  demand_supply_balance: string
  overall_risk_level: string
  key_drivers: string[]
  commentary: string
}

export interface TaxDepreciationResult {
  marginal_tax_rate_pct: number
  annual_depreciation_total: number
  division_40_depreciation: number
  division_43_depreciation: number
  annual_tax_deductible_loss: number
  estimated_annual_tax_benefit: number
  after_tax_weekly_cashflow: number
  is_negatively_geared: boolean
  commentary: string
}

export interface InvestmentPotentialResult {
  verdict: string
  confidence: string
  overall_score: number
  key_strengths: string[]
  key_risks: string[]
  recommendation: string
}

export interface NegotiationResult {
  asking_price: number
  recommended_max_offer: number
  suggested_opening_offer: number
  walk_away_price: number
  estimated_savings_potential: number
  market_position: string
  negotiation_levers: string[]
  confidence: string
  strategy: string
}

export interface PropertyReport {
  property: PropertyInput
  // Each result is optional — users can pick which analyses to run.
  rental_yield?: RentalYieldResult | null
  cashflow?: CashflowResult | null
  roi?: ROIResult | null
  location_risk?: LocationRiskResult | null
  tax_depreciation?: TaxDepreciationResult | null
  investment_potential?: InvestmentPotentialResult | null
  negotiation?: NegotiationResult | null
  selected_analyses?: string[] | null
  generated_at: string
  tokens_used: number
}

// Canonical analysis identifiers — must match backend ANALYSIS_IDS.
export type AnalysisId =
  | 'rental_yield'
  | 'cashflow'
  | 'roi'
  | 'location_risk'
  | 'tax_depreciation'
  | 'investment_potential'
  | 'negotiation'

export const ALL_ANALYSES: AnalysisId[] = [
  'rental_yield',
  'cashflow',
  'roi',
  'location_risk',
  'tax_depreciation',
  'investment_potential',
  'negotiation',
]

export type StreamEvent =
  | { event: 'rental_yield'; data: RentalYieldResult }
  | { event: 'cashflow'; data: CashflowResult }
  | { event: 'roi'; data: ROIResult }
  | { event: 'location_risk'; data: LocationRiskResult }
  | { event: 'tax_depreciation'; data: TaxDepreciationResult }
  | { event: 'investment_potential'; data: InvestmentPotentialResult }
  | { event: 'negotiation'; data: NegotiationResult }
  | { event: 'complete'; data: PropertyReport }
  | { event: 'saved'; data: { report_id: string } }
  | { event: 'error'; data: { message: string } }
