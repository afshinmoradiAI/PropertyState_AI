'use client'
import {
  RentalYieldResult, CashflowResult, ROIResult,
  LocationRiskResult, TaxDepreciationResult, InvestmentPotentialResult,
  NegotiationResult, PropertyReport
} from '../types/property'
import DownloadReportButton from './DownloadReportButton'
import ReportChat from './ReportChat'

interface Props {
  rentalYield?: RentalYieldResult | null
  cashflow?: CashflowResult | null
  roi?: ROIResult | null
  locationRisk?: LocationRiskResult | null
  taxDepreciation?: TaxDepreciationResult | null
  investmentPotential?: InvestmentPotentialResult | null
  negotiation?: NegotiationResult | null
  report?: PropertyReport
  loading: boolean
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
function fmtCurrency(n: number) {
  return '$' + fmt(Math.abs(n))
}
function fmtPct(n: number) {
  return n.toFixed(2) + '%'
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[level] ?? 'bg-slate-100 text-slate-600'}`}>
      {level.toUpperCase()}
    </span>
  )
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const colors: Record<string, string> = {
    BUY: 'bg-emerald-500 text-white',
    HOLD: 'bg-amber-500 text-white',
    AVOID: 'bg-red-500 text-white',
  }
  return (
    <span className={`text-lg font-black px-4 py-1 rounded-xl ${colors[verdict] ?? 'bg-slate-200 text-slate-700'}`}>
      {verdict}
    </span>
  )
}

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700">{score}/{max}</span>
    </div>
  )
}

function Card({ title, icon, children, loading }: { title: string; icon: string; children: React.ReactNode; loading?: boolean }) {
  return (
    <div className="rounded-2xl shadow-sm p-5" style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="font-bold" style={{ color: '#0D1F3C' }}>{title}</h3>
        {loading && <span className="ml-auto text-xs animate-pulse" style={{ color: '#4A7AC7' }}>Analysing…</span>}
      </div>
      {children}
    </div>
  )
}

function PriceBlock({ label, value, tone, hint }: { label: string; value: string; tone: 'neutral' | 'good' | 'warn'; hint?: string }) {
  const colors = {
    neutral: { bg: '#fff', border: '#C4D4F5', text: '#0D1F3C', label: '#2952A3' },
    good: { bg: '#fff', border: '#D4AF37', text: '#065F46', label: '#1B3A6B' },
    warn: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', label: '#92400E' },
  }[tone]
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}>
      <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: colors.label }}>{label}</div>
      <div className="text-lg font-black leading-tight" style={{ color: colors.text }}>{value}</div>
      {hint && <div className="text-[10px] mt-1" style={{ color: colors.label }}>{hint}</div>}
    </div>
  )
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 last:border-0" style={{ borderBottom: '1px solid #EEF2FF' }}>
      <span className="text-sm" style={{ color: '#2952A3' }}>{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold" style={{ color: '#0D1F3C' }}>{value}</span>
        {sub && <div className="text-xs" style={{ color: '#4A7AC7' }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function AnalysisResults({ rentalYield, cashflow, roi, locationRisk, taxDepreciation, investmentPotential, negotiation, report, loading }: Props) {
  if (!rentalYield && !cashflow && !roi && !locationRisk && !taxDepreciation && !investmentPotential && !negotiation && !loading) return null

  return (
    <div className="space-y-4">

      {/* Verdict Banner */}
      {investmentPotential && (
        <div className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#4A7AC7' }}>Investment Verdict</p>
              <VerdictBadge verdict={investmentPotential.verdict} />
              <span className="ml-3 text-sm" style={{ color: '#2952A3' }}>
                Confidence: <b style={{ color: '#0D1F3C' }}>{investmentPotential.confidence}</b>
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#4A7AC7' }}>Overall Score</p>
              <div className="text-3xl font-black" style={{ color: '#0D1F3C' }}>
                {investmentPotential.overall_score}
                <span className="text-base font-normal" style={{ color: '#4A7AC7' }}>/10</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed pt-4" style={{ color: '#0D1F3C', borderTop: '1px solid #EEF2FF' }}>
            {investmentPotential.recommendation}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold mb-2 text-emerald-700">Strengths</p>
              <ul className="space-y-1">
                {investmentPotential.key_strengths.map((s, i) => (
                  <li key={i} className="text-xs flex gap-1.5" style={{ color: '#0D1F3C' }}>
                    <span className="text-emerald-600 mt-0.5">✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold mb-2 text-red-600">Risks</p>
              <ul className="space-y-1">
                {investmentPotential.key_risks.map((r, i) => (
                  <li key={i} className="text-xs flex gap-1.5" style={{ color: '#0D1F3C' }}>
                    <span className="text-red-500 mt-0.5">!</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Negotiation Strategy — prominent, after verdict */}
      {negotiation && (
        <div className="rounded-2xl shadow-sm p-6"
          style={{
            background: 'linear-gradient(135deg, #F0F5FF 0%, #EEF2FF 100%)',
            border: '1px solid #D4AF37',
          }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🤝</span>
            <h3 className="font-bold" style={{ color: '#0D1F3C' }}>Negotiation Strategy</h3>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: '#fff', color: '#2952A3', border: '1px solid #C4D4F5' }}>
              {negotiation.market_position.replace(/_/g, ' ')} · {negotiation.confidence} confidence
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <PriceBlock
              label="Asking"
              value={fmtCurrency(negotiation.asking_price)}
              tone="neutral"
            />
            <PriceBlock
              label="Opening offer"
              value={fmtCurrency(negotiation.suggested_opening_offer)}
              tone="good"
              hint="Start here"
            />
            <PriceBlock
              label="Max offer"
              value={fmtCurrency(negotiation.recommended_max_offer)}
              tone="good"
              hint="Fair value"
            />
            <PriceBlock
              label="Walk away"
              value={fmtCurrency(negotiation.walk_away_price)}
              tone="warn"
              hint="Don't go over"
            />
          </div>

          {negotiation.estimated_savings_potential > 0 && (
            <div className="mb-4 text-sm" style={{ color: '#065F46' }}>
              <b>Potential savings:</b> up to {fmtCurrency(negotiation.estimated_savings_potential)} below asking
            </div>
          )}

          <div className="mb-4">
            <p className="text-xs font-bold mb-2" style={{ color: '#1B3A6B' }}>Negotiation levers (in priority)</p>
            <div className="flex flex-wrap gap-2">
              {negotiation.negotiation_levers.map((lever, i) => (
                <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ backgroundColor: '#fff', color: '#1B3A6B', border: '1px solid #D4AF37' }}>
                  {i + 1}. {lever}
                </span>
              ))}
            </div>
          </div>

          <p className="text-sm leading-relaxed" style={{ color: '#0D1F3C' }}>
            <b>Strategy: </b>{negotiation.strategy}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Rental Yield */}
        <Card title="Rental Yield" icon="📈" loading={loading && !rentalYield}>
          {rentalYield ? (
            <>
              <Row label="Gross Yield" value={fmtPct(rentalYield.gross_yield_pct)} />
              <Row label="Net Yield" value={fmtPct(rentalYield.net_yield_pct)} />
              <Row label="Annual Rental Income" value={fmtCurrency(rentalYield.annual_rental_income)} />
              <Row label="Vacancy Rate" value={fmtPct(rentalYield.estimated_vacancy_rate_pct)} />
              <Row label="Market Rent" value={rentalYield.market_rent_assessment.replace(/_/g, ' ')} />
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">{rentalYield.commentary}</p>
            </>
          ) : (
            <div className="h-24 animate-pulse bg-slate-50 rounded-lg" />
          )}
        </Card>

        {/* Cashflow */}
        <Card title="Cashflow" icon="💰" loading={loading && !cashflow}>
          {cashflow ? (
            <>
              <Row label="Weekly Rent" value={fmtCurrency(cashflow.weekly_rental_income) + '/wk'} />
              <Row label="Mortgage Payment" value={fmtCurrency(cashflow.weekly_mortgage_payment) + '/wk'} />
              <Row label="Expenses" value={fmtCurrency(cashflow.weekly_expenses) + '/wk'} />
              <Row
                label="Net Cashflow"
                value={(cashflow.weekly_net_cashflow >= 0 ? '+' : '-') + fmtCurrency(cashflow.weekly_net_cashflow) + '/wk'}
                sub={`${fmtCurrency(cashflow.annual_net_cashflow)}/yr`}
              />
              <Row label="Break-even Rent" value={fmtCurrency(cashflow.break_even_rent) + '/wk'} />
              <div className={`mt-2 text-xs font-bold px-3 py-1.5 rounded-lg inline-block ${cashflow.is_positive_cashflow ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {cashflow.is_positive_cashflow ? 'Positive Cashflow' : 'Negatively Geared'}
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">{cashflow.commentary}</p>
            </>
          ) : (
            <div className="h-24 animate-pulse bg-slate-50 rounded-lg" />
          )}
        </Card>

        {/* ROI */}
        <Card title="Return on Investment" icon="🏦" loading={loading && !roi}>
          {roi ? (
            <>
              <Row label="Capital Growth (pa)" value={fmtPct(roi.estimated_capital_growth_pct_pa)} />
              <Row label="Total Return (pa)" value={fmtPct(roi.total_return_pct_pa)} />
              <Row label="5-Year Projected Value" value={fmtCurrency(roi.projected_value_5_years)} />
              <Row label="Equity in 5 Years" value={fmtCurrency(roi.equity_in_5_years)} />
              <Row label="Payback Period" value={roi.payback_period_years ? `${roi.payback_period_years} yrs` : 'N/A'} />
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">{roi.commentary}</p>
            </>
          ) : (
            <div className="h-24 animate-pulse bg-slate-50 rounded-lg" />
          )}
        </Card>

        {/* Location Risk */}
        <Card title="Location & Risk" icon="📍" loading={loading && !locationRisk}>
          {locationRisk ? (
            <>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Suburb Score</span>
                </div>
                <ScoreBar score={locationRisk.suburb_score} />
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Infrastructure Score</span>
                </div>
                <ScoreBar score={locationRisk.infrastructure_score} />
              </div>
              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">Flood</div>
                  <RiskBadge level={locationRisk.flood_risk} />
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">Crime</div>
                  <RiskBadge level={locationRisk.crime_risk} />
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">Vacancy</div>
                  <RiskBadge level={locationRisk.vacancy_risk} />
                </div>
              </div>
              <Row label="Demand/Supply" value={locationRisk.demand_supply_balance.replace(/_/g, ' ')} />
              <Row label="Overall Risk" value="" />
              <RiskBadge level={locationRisk.overall_risk_level} />
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Key Drivers</p>
                <ul className="space-y-1">
                  {locationRisk.key_drivers.map((d, i) => (
                    <li key={i} className="text-xs text-slate-600">• {d}</li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">{locationRisk.commentary}</p>
            </>
          ) : (
            <div className="h-24 animate-pulse bg-slate-50 rounded-lg" />
          )}
        </Card>

        {/* Tax & Depreciation */}
        <Card title="Tax & Depreciation" icon="🧾" loading={loading && !taxDepreciation}>
          {taxDepreciation ? (
            <>
              <Row label="Marginal Tax Rate (assumed)" value={fmtPct(taxDepreciation.marginal_tax_rate_pct)} />
              <Row
                label="Annual Depreciation"
                value={fmtCurrency(taxDepreciation.annual_depreciation_total)}
                sub={`Div 40: ${fmtCurrency(taxDepreciation.division_40_depreciation)} · Div 43: ${fmtCurrency(taxDepreciation.division_43_depreciation)}`}
              />
              <Row
                label="Annual Deductible Loss"
                value={(taxDepreciation.annual_tax_deductible_loss >= 0 ? '' : '+') + fmtCurrency(taxDepreciation.annual_tax_deductible_loss)}
              />
              <Row label="Est. Annual Tax Benefit" value={fmtCurrency(taxDepreciation.estimated_annual_tax_benefit)} />
              <Row
                label="After-Tax Cashflow"
                value={(taxDepreciation.after_tax_weekly_cashflow >= 0 ? '+' : '-') + fmtCurrency(taxDepreciation.after_tax_weekly_cashflow) + '/wk'}
              />
              <div
                className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg inline-block"
                style={{
                  backgroundColor: taxDepreciation.is_negatively_geared ? '#FEF3C7' : '#D1FAE5',
                  color: taxDepreciation.is_negatively_geared ? '#92400E' : '#065F46',
                }}
              >
                {taxDepreciation.is_negatively_geared ? 'Negatively Geared' : 'Positively Geared'}
              </div>
              <p className="mt-3 text-xs leading-relaxed" style={{ color: '#2952A3' }}>{taxDepreciation.commentary}</p>
              <p className="mt-2 text-[10px] italic" style={{ color: '#4A7AC7' }}>
                Estimates only — confirm with a quantity surveyor & accountant.
              </p>
            </>
          ) : (
            <div className="h-24 animate-pulse bg-slate-50 rounded-lg" />
          )}
        </Card>
      </div>

      {report && (
        <>
          <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{
              background: 'linear-gradient(135deg, #0D1F3C 0%, #1B3A6B 100%)',
            }}>
            <div className="text-left">
              <p className="text-sm font-bold" style={{ color: '#F0F5FF' }}>Analysis complete</p>
              <p className="text-xs mt-0.5" style={{ color: '#D4AF37' }}>
                Generated {new Date(report.generated_at).toLocaleString('en-AU')} · {report.tokens_used.toLocaleString()} tokens used
              </p>
            </div>
            <DownloadReportButton report={report} />
          </div>

          {/* Chat with the report */}
          <ReportChat report={report} />
        </>
      )}
    </div>
  )
}
