'use client'
import { SuburbSearchResult } from '../types/suburb'

interface Props { result: SuburbSearchResult }

function fmt(n: number, d = 0) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: d, maximumFractionDigits: d })
}
function aud(n: number) { return '$' + fmt(Math.abs(n)) }
function pct(n: number) { return n.toFixed(2) + '%' }

const VERDICT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  STRONG_BUY: { bg: '#065F46', text: '#fff', label: 'STRONG BUY' },
  BUY: { bg: '#10B981', text: '#fff', label: 'BUY' },
  WAIT: { bg: '#F59E0B', text: '#fff', label: 'WAIT' },
  AVOID: { bg: '#991B1B', text: '#fff', label: 'AVOID' },
}

export default function SuburbSearchResults({ result }: Props) {
  const vc = VERDICT_COLORS[result.verdict] ?? { bg: '#4A7AC7', text: '#fff', label: result.verdict }

  return (
    <div className="space-y-4">
      {/* Verdict header */}
      <div className="rounded-2xl p-6 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #fff 0%, #EEF2FF 100%)',
          border: '1px solid #D4AF37',
        }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#4A7AC7' }}>Verdict</div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-xl font-black px-4 py-1.5 rounded-xl"
                style={{ backgroundColor: vc.bg, color: vc.text }}>
                {vc.label}
              </span>
              <span className="text-sm" style={{ color: '#2952A3' }}>
                Confidence: <b style={{ color: '#0D1F3C' }}>{result.confidence}</b>
              </span>
            </div>
            <div className="mt-3 text-lg font-bold" style={{ color: '#0D1F3C' }}>
              {result.suburb}, {result.state}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#4A7AC7' }}>Suburb Score</div>
            <div className="text-4xl font-black" style={{ color: '#0D1F3C' }}>
              {result.overall_score}
              <span className="text-lg font-normal" style={{ color: '#4A7AC7' }}>/10</span>
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed pt-4" style={{ color: '#0D1F3C', borderTop: '1px solid #C4D4F5' }}>
          {result.recommendation}
        </p>
      </div>

      {/* What to buy */}
      <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🎯</span>
          <h3 className="font-bold" style={{ color: '#0D1F3C' }}>What to Buy</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl p-4" style={{ backgroundColor: '#EEF2FF', border: '1px solid #C4D4F5' }}>
            <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#2952A3' }}>Target band</div>
            <div className="text-base font-black" style={{ color: '#0D1F3C' }}>
              {aud(result.target_price_band_min)} – {aud(result.target_price_band_max)}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #1B3A6B, #D4AF37)' }}>
            <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#FFE8C9' }}>Sweet spot</div>
            <div className="text-base font-black" style={{ color: '#fff' }}>
              {aud(result.sweet_spot_price)}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#EEF2FF', border: '1px solid #C4D4F5' }}>
            <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#2952A3' }}>Typical yield</div>
            <div className="text-base font-black" style={{ color: '#0D1F3C' }}>
              {pct(result.typical_gross_yield_pct)}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#2952A3' }}>Recommended Property Types</div>
          <div className="flex flex-wrap gap-2">
            {result.recommended_property_types.map((t, i) => (
              <span key={i} className="text-sm font-semibold px-3 py-1.5 rounded-full"
                style={{
                  background: i === 0 ? 'linear-gradient(135deg, #1B3A6B, #D4AF37)' : '#fff',
                  color: i === 0 ? '#fff' : '#1B3A6B',
                  border: i === 0 ? 'none' : '1px solid #D4AF37',
                }}>
                {i === 0 ? '★ ' : ''}{t}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#2952A3' }}>Target Pockets & Streets</div>
          <ul className="space-y-1">
            {result.target_pockets.map((p, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: '#0D1F3C' }}>
                <span style={{ color: '#D4AF37' }}>▸</span>{p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Goal fit */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#F0F5FF', border: '1px solid #C4D4F5' }}>
        <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#2952A3' }}>Fit for your goal</div>
        <p className="text-sm leading-relaxed" style={{ color: '#0D1F3C' }}>{result.fit_for_goal}</p>
      </div>

      {/* Market data grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📊</span>
            <h3 className="font-bold" style={{ color: '#0D1F3C' }}>Market Snapshot</h3>
          </div>
          <Row label="Median house price" value={aud(result.median_house_price)} />
          <Row label="Median unit price" value={aud(result.median_unit_price)} />
          <Row label="Typical house rent" value={aud(result.typical_house_rent_weekly) + '/wk'} />
          <Row label="Typical unit rent" value={aud(result.typical_unit_rent_weekly) + '/wk'} />
          <Row label="Typical gross yield" value={pct(result.typical_gross_yield_pct)} />
        </div>

        <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">👥</span>
            <h3 className="font-bold" style={{ color: '#0D1F3C' }}>Who Lives Here</h3>
          </div>
          <p className="text-sm leading-relaxed mb-3" style={{ color: '#0D1F3C' }}>{result.demographic_profile}</p>
          <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#2952A3' }}>Infrastructure highlights</div>
          <ul className="space-y-1">
            {result.infrastructure_highlights.map((h, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: '#0D1F3C' }}>
                <span style={{ color: '#D4AF37' }}>•</span>{h}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Drivers & risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📈</span>
            <h3 className="font-bold" style={{ color: '#065F46' }}>Growth Drivers</h3>
          </div>
          <ul className="space-y-1.5">
            {result.growth_drivers.map((d, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: '#0D1F3C' }}>
                <span className="text-emerald-600 mt-0.5">✓</span>{d}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠️</span>
            <h3 className="font-bold" style={{ color: '#991B1B' }}>Key Risks</h3>
          </div>
          <ul className="space-y-1.5">
            {result.key_risks.map((r, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: '#0D1F3C' }}>
                <span className="text-red-500 mt-0.5">!</span>{r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid #EEF2FF' }}>
      <span className="text-sm" style={{ color: '#2952A3' }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: '#0D1F3C' }}>{value}</span>
    </div>
  )
}
