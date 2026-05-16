'use client'
import { useState } from 'react'
import { PropertyInput } from '../types/property'

interface Props {
  onSubmit: (data: PropertyInput) => void
  loading: boolean
}

const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']
const PROPERTY_TYPES = ['house', 'unit', 'townhouse', 'land']

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

  function set<K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  const inputClass =
    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors'
    + ' border-amber-200 bg-amber-50/30 text-stone-800 placeholder-stone-400'
    + ' focus:border-amber-600 focus:ring-amber-100'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wide mb-1' +
    ' text-amber-800'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Property Identity */}
      <section>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#2C1A0E' }}>
          <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold text-white" style={{ background: '#8B5E3C' }}>1</span>
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

      {/* Financials */}
      <section>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#2C1A0E' }}>
          <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold text-white" style={{ background: '#8B5E3C' }}>2</span>
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

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl py-3 text-sm font-bold text-white active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: loading ? '#A07850' : 'linear-gradient(135deg, #6B3A1F, #C4956A)' }}
      >
        {loading ? 'Analysing…' : 'Analyse Property →'}
      </button>
    </form>
  )
}
