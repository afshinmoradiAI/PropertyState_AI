'use client'
import { useState } from 'react'
import { AnalysisId, ALL_ANALYSES, PropertyInput } from '../types/property'

interface Props {
  onSubmit: (data: PropertyInput, selected: AnalysisId[]) => void
  loading: boolean
}

const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']
const PROPERTY_TYPES = ['house', 'unit', 'townhouse', 'land']

// Analysis catalog — what the user picks in step 3.
const ANALYSIS_CATALOG: { id: AnalysisId; icon: string; title: string; desc: string; tier: 'core' | 'extras' }[] = [
  { id: 'rental_yield', icon: '📈', title: 'Rental Yield', desc: 'Gross & net yield, vacancy rate', tier: 'core' },
  { id: 'cashflow', icon: '💰', title: 'Cashflow', desc: 'Weekly income vs expenses', tier: 'core' },
  { id: 'roi', icon: '🏆', title: 'ROI & Growth', desc: '5-yr value & equity projection', tier: 'core' },
  { id: 'location_risk', icon: '📍', title: 'Location Risk', desc: 'Suburb score, flood, crime, demand', tier: 'core' },
  { id: 'investment_potential', icon: '🎯', title: 'BUY / HOLD / AVOID Verdict', desc: 'Final decision with confidence score', tier: 'core' },
  { id: 'tax_depreciation', icon: '🧾', title: 'Tax & Depreciation', desc: 'Negative gearing, tax benefit', tier: 'extras' },
  { id: 'negotiation', icon: '🤝', title: 'Negotiation Strategy', desc: 'Max offer, walk-away, levers', tier: 'extras' },
]

// Presets — quick way to set the selection.
const PRESETS: { id: string; label: string; desc: string; ids: AnalysisId[] }[] = [
  { id: 'quick', label: '⚡ Quick', desc: 'Verdict only — fastest',
    ids: ['rental_yield', 'cashflow', 'roi', 'location_risk', 'investment_potential'] },
  { id: 'standard', label: '⭐ Standard', desc: 'Recommended — best balance',
    ids: ['rental_yield', 'cashflow', 'roi', 'location_risk', 'investment_potential', 'tax_depreciation'] },
  { id: 'full', label: '🏆 Full Report', desc: 'Everything — most thorough',
    ids: [...ALL_ANALYSES] },
]

export default function PropertyForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<PropertyInput>({
    address: '',
    suburb: '',
    state: 'NSW',
    postcode: '',
    property_type: 'house',
    bedrooms: 3,
    bathrooms: 2,
    car_spaces: 1,
    purchase_price: 800000,
    estimated_rent_per_week: 700,
    loan_amount: null,
    interest_rate: 6.5,
    loan_term_years: 30,
    is_new_build: false,
    year_built: null,
  })

  // Default to the Standard preset.
  const [selected, setSelected] = useState<Set<AnalysisId>>(new Set(PRESETS[1].ids))

  function set<K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toggle(id: AnalysisId) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function applyPreset(ids: AnalysisId[]) {
    setSelected(new Set(ids))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form, Array.from(selected))
  }

  const inputClass =
    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors'
    + ' border-blue-200 bg-blue-50/30 text-slate-800 placeholder-slate-400'
    + ' focus:border-yellow-500 focus:ring-yellow-100'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wide mb-1 text-blue-900'

  // Form readiness
  const filled = [
    !!form.address.trim(),
    !!form.suburb.trim(),
    !!form.postcode.trim(),
    form.purchase_price > 0,
    form.estimated_rent_per_week > 0,
  ]
  const fieldsComplete = filled.every(Boolean)
  const hasSelection = selected.size > 0
  const readyToSubmit = fieldsComplete && hasSelection
  const fieldsPct = Math.round((filled.filter(Boolean).length / filled.length) * 100)

  // Detect active preset (for visual highlight)
  const activePreset = PRESETS.find(p =>
    p.ids.length === selected.size && p.ids.every(id => selected.has(id))
  )?.id

  return (
    <form onSubmit={handleSubmit} className="space-y-7 pb-28 relative">

      {/* ─── STEP 1 — Property Details ─── */}
      <section>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#0D1F3C' }}>
          <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold text-white" style={{ background: '#1B3A6B' }}>1</span>
          Property Details
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className={labelClass}>Full Address</label>
            <input className={inputClass} required value={form.address}
              onChange={e => set('address', e.target.value)} placeholder="12 Smith St, Suburb NSW 2000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Suburb</label>
              <input className={inputClass} required value={form.suburb}
                onChange={e => set('suburb', e.target.value)} placeholder="Parramatta" />
            </div>
            <div>
              <label className={labelClass}>Postcode</label>
              <input className={inputClass} required value={form.postcode}
                onChange={e => set('postcode', e.target.value)} placeholder="2150" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>State</label>
              <select className={inputClass} value={form.state} onChange={e => set('state', e.target.value)}>
                {AU_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Property Type</label>
              <select className={inputClass} value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Beds</label>
              <input type="number" min={1} max={10} className={inputClass} value={form.bedrooms}
                onChange={e => set('bedrooms', +e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Baths</label>
              <input type="number" min={1} max={10} className={inputClass} value={form.bathrooms}
                onChange={e => set('bathrooms', +e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Car Spaces</label>
              <input type="number" min={0} max={10} className={inputClass} value={form.car_spaces}
                onChange={e => set('car_spaces', +e.target.value)} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── STEP 2 — Financials ─── */}
      <section>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#0D1F3C' }}>
          <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold text-white" style={{ background: '#1B3A6B' }}>2</span>
          Financials
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Purchase Price ($)</label>
              <input type="number" min={0} className={inputClass} value={form.purchase_price}
                onChange={e => set('purchase_price', +e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Est. Rent / Week ($)</label>
              <input type="number" min={0} className={inputClass} value={form.estimated_rent_per_week}
                onChange={e => set('estimated_rent_per_week', +e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Loan Amount ($)</label>
              <input type="number" min={0} className={inputClass}
                value={form.loan_amount ?? ''}
                placeholder="Auto (80% LVR)"
                onChange={e => set('loan_amount', e.target.value ? +e.target.value : null)} />
            </div>
            <div>
              <label className={labelClass}>Interest Rate (%)</label>
              <input type="number" step="0.01" min={0} className={inputClass} value={form.interest_rate}
                onChange={e => set('interest_rate', +e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Loan Term (yrs)</label>
              <input type="number" min={5} max={30} className={inputClass} value={form.loan_term_years}
                onChange={e => set('loan_term_years', +e.target.value)} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── STEP 3 — Choose Your Report ─── */}
      <section>
        <h3 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: '#0D1F3C' }}>
          <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold text-white" style={{ background: '#1B3A6B' }}>3</span>
          Choose Your Report
        </h3>
        <p className="text-xs mb-3" style={{ color: '#2952A3' }}>
          Pick a preset, or tick exactly the analyses you want.
        </p>

        {/* Preset buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {PRESETS.map(p => {
            const isActive = activePreset === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.ids)}
                className="rounded-xl p-2.5 text-left transition-all"
                style={{
                  backgroundColor: isActive ? '#1B3A6B' : '#F0F5FF',
                  border: `1.5px solid ${isActive ? '#1B3A6B' : '#C4D4F5'}`,
                  color: isActive ? '#F0F5FF' : '#0D1F3C',
                }}
              >
                <div className="text-xs font-black">{p.label}</div>
                <div className="text-[10px] mt-0.5" style={{ color: isActive ? '#F0D060' : '#2952A3' }}>
                  {p.desc}
                </div>
              </button>
            )
          })}
        </div>

        {/* Checkbox list */}
        <div className="space-y-1.5">
          {ANALYSIS_CATALOG.map(a => {
            const isOn = selected.has(a.id)
            return (
              <label
                key={a.id}
                className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all hover:bg-blue-50/50"
                style={{
                  backgroundColor: isOn ? '#F0F5FF' : 'transparent',
                  border: `1px solid ${isOn ? '#D4AF37' : '#C4D4F5'}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(a.id)}
                  className="mt-0.5 w-4 h-4 rounded accent-yellow-600 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{a.icon}</span>
                    <span className="text-sm font-bold" style={{ color: '#0D1F3C' }}>{a.title}</span>
                    {a.tier === 'extras' && (
                      <span className="text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: '#EEF2FF', color: '#2952A3' }}>extra</span>
                    )}
                  </div>
                  <div className="text-[11px]" style={{ color: '#2952A3' }}>{a.desc}</div>
                </div>
              </label>
            )
          })}
        </div>
      </section>

      {/* ─── Sticky Submit Footer ─── */}
      <div className="sticky bottom-0 -mx-7 -mb-7 px-7 pt-4 pb-5"
        style={{
          background: 'linear-gradient(to top, #fff 70%, rgba(255,255,255,0.9) 95%, rgba(255,255,255,0))',
          borderTop: '1px solid rgba(196,212,245,0.6)',
          backdropFilter: 'blur(6px)',
        }}>
        {/* Summary row */}
        <div className="flex items-center justify-between mb-2.5 text-[11px]">
          <span className="font-bold uppercase tracking-wide" style={{ color: '#2952A3' }}>
            {!fieldsComplete
              ? `Property ${fieldsPct}% complete`
              : !hasSelection
                ? 'Pick at least one analysis'
                : `✓ Ready · ${selected.size} ${selected.size === 1 ? 'analysis' : 'analyses'} selected`}
          </span>
          <div className="flex-1 mx-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#EEF2FF' }}>
            <div className="h-full transition-all duration-300"
              style={{
                width: readyToSubmit ? '100%' : `${fieldsPct}%`,
                background: readyToSubmit
                  ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                  : 'linear-gradient(90deg, #1B3A6B, #D4AF37)',
              }} />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !readyToSubmit}
          className="w-full rounded-xl py-3.5 text-sm font-bold text-white active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          style={{
            background: loading
              ? '#4A7AC7'
              : readyToSubmit
                ? 'linear-gradient(135deg, #1B3A6B, #D4AF37)'
                : '#D4AF37',
            boxShadow: readyToSubmit ? '0 8px 24px rgba(212,175,55,0.4)' : 'none',
          }}
        >
          {loading
            ? 'Analysing…'
            : !fieldsComplete
              ? 'Fill required property fields'
              : !hasSelection
                ? 'Select at least one analysis'
                : `Run ${selected.size} ${selected.size === 1 ? 'Analysis' : 'Analyses'} →`}
        </button>
      </div>
    </form>
  )
}
