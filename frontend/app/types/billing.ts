export interface PlanOut {
  id: string
  label: string
  price_aud: number
  tokens_per_month: number
  generations_per_month: number
  allowed_models: string[]
  default_model: string
  available: boolean
  description: string
}

export interface PlansResponse {
  plans: PlanOut[]
}

export interface UsageResponse {
  plan: PlanOut
  period: string
  tokens_used: number
  tokens_limit: number
  generations_used: number
  generations_limit: number
}

export interface ModelInfo {
  id: string
  label: string
  input_usd_per_m: number
  output_usd_per_m: number
}

export interface ModelsResponse {
  models: ModelInfo[]
}
