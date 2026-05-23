'use client'
import { PropertyInput, PropertyReport } from '../types/property'

interface PartialReport {
  property: PropertyInput
  rental_yield?: PropertyReport['rental_yield']
  cashflow?: PropertyReport['cashflow']
  roi?: PropertyReport['roi']
  location_risk?: PropertyReport['location_risk']
  tax_depreciation?: PropertyReport['tax_depreciation']
  investment_potential?: PropertyReport['investment_potential']
  negotiation?: PropertyReport['negotiation']
  complete?: PropertyReport
}

interface Props {
  reports: PartialReport[]
  loading: boolean
}

function fmt(n: number, d = 0) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: d, maximumFractionDigits: d })
}
function aud(n: number) { return '$' + fmt(Math.abs(n)) }
function pct(n: number) { return n.toFixed(2) + '%' }

// Returns the index of the "winner" — the property where higher (or lower) value is best.
function pickWinner(values: (number | undefined)[], mode: 'higher' | 'lower'): number | null {
  const defined = values.map((v, i) => ({ v, i })).filter((x) => x.v !== undefined) as { v: number; i: number }[]
  if (defined.length < 2) return null
  const sorted = [...defined].sort((a, b) => (mode === 'higher' ? b.v - a.v : a.v - b.v))
  if (sorted[0].v === sorted[1].v) return null
  return sorted[0].i
}

function MetricRow({
  label, reports, getter, format, mode,
}: {
  label: string
  reports: PartialReport[]
  getter: (r: PartialReport) => number | undefined
  format: (v: number) => string
  mode: 'higher' | 'lower'
}) {
  const values = reports.map(getter)
  const winner = pickWinner(values, mode)
  return (
    <tr style={{ borderBottom: '1px solid #F5EDE3' }}>
      <td className="py-2.5 px-3 text-sm" style={{ color: '#8B5E3C' }}>{label}</td>
      {reports.map((_, i) => {
        const v = values[i]
        const isWinner = winner === i
        return (
          <td key={i} className="py-2.5 px-3 text-sm text-right font-bold"
            style={{
              color: v === undefined ? '#D4B896' : isWinner ? '#065F46' : '#2C1A0E',
              backgroundColor: isWinner ? 'rgba(16,185,129,0.08)' : 'transparent',
            }}>
            {v === undefined ? '…' : (
              <>
                {format(v)}
                {isWinner && <span className="ml-1 text-[10px]">🏆</span>}
              </>
            )}
          </td>
        )
      })}
    </tr>
  )
}

function StringRow({
  label, reports, getter,
}: {
  label: string
  reports: PartialReport[]
  getter: (r: PartialReport) => string | undefined
}) {
  return (
    <tr style={{ borderBottom: '1px solid #F5EDE3' }}>
      <td className="py-2.5 px-3 text-sm" style={{ color: '#8B5E3C' }}>{label}</td>
      {reports.map((r, i) => {
        const v = getter(r)
        return (
          <td key={i} className="py-2.5 px-3 text-sm text-right font-bold capitalize"
            style={{ color: v === undefined ? '#D4B896' : '#2C1A0E' }}>
            {v === undefined ? '…' : v.replace(/_/g, ' ')}
          </td>
        )
      })}
    </tr>
  )
}

function SectionHeader({ label, cols }: { label: string; cols: number }) {
  return (
    <tr>
      <td colSpan={cols + 1} className="py-2 px-3 text-xs font-bold uppercase tracking-wide"
        style={{ color: '#fff', backgroundColor: '#6B3A1F' }}>
        {label}
      </td>
    </tr>
  )
}

export default function ComparisonResults({ reports, loading }: Props) {
  const cols = reports.length

  // Pick the overall winner: highest investment_potential.overall_score
  const verdictScores = reports.map((r) => r.investment_potential?.overall_score)
  const overallWinner = pickWinner(verdictScores, 'higher')

  return (
    <div>
      {/* Verdict cards on top */}
      <div className={`grid gap-4 mb-6 ${cols === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {reports.map((r, i) => {
          const ip = r.investment_potential
          const isWinner = overallWinner === i && ip
          return (
            <div key={i} className="rounded-2xl p-5 relative"
              style={{
                backgroundColor: '#fff',
                border: isWinner ? '2px solid #C4956A' : '1px solid #E8D5B7',
                boxShadow: isWinner ? '0 8px 20px rgba(107,58,31,0.15)' : 'none',
              }}>
              {isWinner && (
                <div className="absolute -top-3 left-4 text-[10px] font-black px-2.5 py-1 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #6B3A1F, #C4956A)', color: '#fff' }}>
                  🏆 BEST OVERALL
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                  style={{ background: 'linear-gradient(135deg, #6B3A1F, #C4956A)' }}>
                  {String.fromCharCode(65 + i)}
                </div>
                <div className="text-xs font-bold uppercase" style={{ color: '#8B5E3C' }}>
                  {r.property.suburb}, {r.property.state}
                </div>
              </div>
              <div className="text-xs mb-3 truncate" style={{ color: '#A07850' }}>{r.property.address}</div>

              {ip ? (
                <>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-2xl font-black px-3 py-1 rounded-lg"
                      style={{
                        backgroundColor: ip.verdict === 'BUY' ? '#065F46' : ip.verdict === 'HOLD' ? '#92400E' : '#991B1B',
                        color: '#fff',
                      }}>
                      {ip.verdict}
                    </span>
                    <span className="text-3xl font-black" style={{ color: '#2C1A0E' }}>
                      {ip.overall_score}
                      <span className="text-base font-normal" style={{ color: '#A07850' }}>/10</span>
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: '#8B5E3C' }}>
                    Confidence: <b style={{ color: '#2C1A0E' }}>{ip.confidence}</b>
                  </p>
                </>
              ) : (
                <div className="h-16 animate-pulse rounded-lg" style={{ backgroundColor: '#F5EDE3' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Comparison table */}
      <div className="rounded-2xl overflow-hidden shadow-sm"
        style={{ backgroundColor: '#fff', border: '1px solid #E8D5B7' }}>
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: '#F5EDE3' }}>
              <th className="py-3 px-3 text-left text-xs font-bold uppercase tracking-wide"
                style={{ color: '#6B3A1F' }}>Metric</th>
              {reports.map((r, i) => (
                <th key={i} className="py-3 px-3 text-right text-xs font-bold uppercase tracking-wide"
                  style={{ color: '#6B3A1F' }}>
                  {String.fromCharCode(65 + i)} · {r.property.suburb}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SectionHeader label="Rental Yield" cols={cols} />
            <MetricRow label="Gross Yield" reports={reports} getter={(r) => r.rental_yield?.gross_yield_pct} format={pct} mode="higher" />
            <MetricRow label="Net Yield" reports={reports} getter={(r) => r.rental_yield?.net_yield_pct} format={pct} mode="higher" />
            <MetricRow label="Annual Rental Income" reports={reports} getter={(r) => r.rental_yield?.annual_rental_income} format={aud} mode="higher" />
            <MetricRow label="Vacancy Rate" reports={reports} getter={(r) => r.rental_yield?.estimated_vacancy_rate_pct} format={pct} mode="lower" />

            <SectionHeader label="Cashflow" cols={cols} />
            <MetricRow label="Weekly Net Cashflow" reports={reports} getter={(r) => r.cashflow?.weekly_net_cashflow} format={(v) => (v >= 0 ? '+' : '-') + aud(v)} mode="higher" />
            <MetricRow label="Annual Cashflow" reports={reports} getter={(r) => r.cashflow?.annual_net_cashflow} format={aud} mode="higher" />
            <MetricRow label="Break-even Rent (wk)" reports={reports} getter={(r) => r.cashflow?.break_even_rent} format={aud} mode="lower" />

            <SectionHeader label="ROI" cols={cols} />
            <MetricRow label="Capital Growth pa" reports={reports} getter={(r) => r.roi?.estimated_capital_growth_pct_pa} format={pct} mode="higher" />
            <MetricRow label="Total Return pa" reports={reports} getter={(r) => r.roi?.total_return_pct_pa} format={pct} mode="higher" />
            <MetricRow label="5-Year Value" reports={reports} getter={(r) => r.roi?.projected_value_5_years} format={aud} mode="higher" />
            <MetricRow label="5-Year Equity" reports={reports} getter={(r) => r.roi?.equity_in_5_years} format={aud} mode="higher" />

            <SectionHeader label="Location & Risk" cols={cols} />
            <MetricRow label="Suburb Score" reports={reports} getter={(r) => r.location_risk?.suburb_score} format={(v) => `${v}/10`} mode="higher" />
            <MetricRow label="Infrastructure Score" reports={reports} getter={(r) => r.location_risk?.infrastructure_score} format={(v) => `${v}/10`} mode="higher" />
            <StringRow label="Flood Risk" reports={reports} getter={(r) => r.location_risk?.flood_risk} />
            <StringRow label="Crime Risk" reports={reports} getter={(r) => r.location_risk?.crime_risk} />
            <StringRow label="Vacancy Risk" reports={reports} getter={(r) => r.location_risk?.vacancy_risk} />
            <StringRow label="Overall Risk" reports={reports} getter={(r) => r.location_risk?.overall_risk_level} />

            <SectionHeader label="Tax & Depreciation" cols={cols} />
            <MetricRow label="Annual Depreciation" reports={reports} getter={(r) => r.tax_depreciation?.annual_depreciation_total} format={aud} mode="higher" />
            <MetricRow label="Est. Tax Benefit" reports={reports} getter={(r) => r.tax_depreciation?.estimated_annual_tax_benefit} format={aud} mode="higher" />
            <MetricRow label="After-Tax Weekly Cashflow" reports={reports} getter={(r) => r.tax_depreciation?.after_tax_weekly_cashflow} format={(v) => (v >= 0 ? '+' : '-') + aud(v)} mode="higher" />

            <SectionHeader label="Negotiation" cols={cols} />
            <MetricRow label="Asking Price" reports={reports} getter={(r) => r.negotiation?.asking_price} format={aud} mode="lower" />
            <MetricRow label="Max Recommended Offer" reports={reports} getter={(r) => r.negotiation?.recommended_max_offer} format={aud} mode="lower" />
            <MetricRow label="Potential Savings" reports={reports} getter={(r) => r.negotiation?.estimated_savings_potential} format={aud} mode="higher" />
          </tbody>
        </table>
      </div>

      {loading && (
        <p className="mt-4 text-xs text-center animate-pulse" style={{ color: '#8B5E3C' }}>
          Streaming results from {cols} parallel analyses…
        </p>
      )}
    </div>
  )
}
