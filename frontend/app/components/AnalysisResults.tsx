'use client'
import {
  RentalYieldResult, CashflowResult, ROIResult,
  LocationRiskResult, InvestmentPotentialResult, PropertyReport
} from '../types/property'

interface Props {
  rentalYield?: RentalYieldResult
  cashflow?: CashflowResult
  roi?: ROIResult
  locationRisk?: LocationRiskResult
  investmentPotential?: InvestmentPotentialResult
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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="font-bold text-slate-800">{title}</h3>
        {loading && <span className="ml-auto text-xs text-slate-400 animate-pulse">Analysing…</span>}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-slate-800">{value}</span>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </div>
    </div>
  )
}

export default function AnalysisResults({ rentalYield, cashflow, roi, locationRisk, investmentPotential, report, loading }: Props) {
  if (!rentalYield && !cashflow && !roi && !locationRisk && !investmentPotential && !loading) return null

  return (
    <div className="space-y-4">

      {/* Verdict Banner */}
      {investmentPotential && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Investment Verdict</p>
              <VerdictBadge verdict={investmentPotential.verdict} />
              <span className="ml-3 text-sm text-slate-500">Confidence: <b className="text-slate-700">{investmentPotential.confidence}</b></span>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Overall Score</p>
              <div className="text-3xl font-black text-slate-800">{investmentPotential.overall_score}<span className="text-base font-normal text-slate-400">/10</span></div>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-4">{investmentPotential.recommendation}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-600 mb-2">Strengths</p>
              <ul className="space-y-1">
                {investmentPotential.key_strengths.map((s, i) => (
                  <li key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-emerald-500 mt-0.5">✓</span>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-red-500 mb-2">Risks</p>
              <ul className="space-y-1">
                {investmentPotential.key_risks.map((r, i) => (
                  <li key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-red-400 mt-0.5">!</span>{r}</li>
                ))}
              </ul>
            </div>
          </div>
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
      </div>

      {report && (
        <p className="text-xs text-center text-slate-400">
          Generated at {new Date(report.generated_at).toLocaleString('en-AU')} · {report.tokens_used.toLocaleString()} tokens used
        </p>
      )}
    </div>
  )
}
