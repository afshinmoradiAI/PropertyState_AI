import { PropertyReport } from './property'

export interface ReportSummary {
  id: string
  address: string
  suburb: string
  state: string
  postcode: string
  property_type: string
  purchase_price: number
  verdict: string | null
  overall_score: number | null
  tokens_used: number
  created_at: string
}

export interface LibraryListResponse {
  reports: ReportSummary[]
  total: number
}

export interface ReportDetailResponse {
  id: string
  report: PropertyReport
}
