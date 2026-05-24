'use client'
import { PropertyInput } from '../types/property'

interface Props {
  index: number
  label: string
  value: PropertyInput
  onChange: (v: PropertyInput) => void
  onRemove?: () => void
  disabled?: boolean
}

const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']
const PROPERTY_TYPES = ['house', 'unit', 'townhouse', 'land']

export default function MiniPropertyForm({ label, value, onChange, onRemove, disabled }: Props) {
  function set<K extends keyof PropertyInput>(key: K, v: PropertyInput[K]) {
    onChange({ ...value, [key]: v })
  }

  const inputCls =
    'w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 transition-colors' +
    ' border-blue-200 bg-blue-50/30 text-stone-800 placeholder-stone-400' +
    ' focus:border-yellow-500 focus:ring-yellow-100 disabled:opacity-50'
  const labelCls = 'block text-[10px] font-semibold uppercase tracking-wide mb-1 text-blue-900'

  return (
    <div className="rounded-2xl p-5 shadow-sm"
      style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white"
            style={{ background: 'linear-gradient(135deg, #1B3A6B, #D4AF37)' }}>
            {label}
          </div>
          <h3 className="text-sm font-bold" style={{ color: '#0D1F3C' }}>Property {label}</h3>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="text-xs font-semibold transition-colors"
            style={{ color: '#4A7AC7' }}
            aria-label="Remove property"
          >
            Remove
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        <div>
          <label className={labelCls}>Address</label>
          <input
            disabled={disabled}
            className={inputCls}
            value={value.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="12 Smith St"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Suburb</label>
            <input
              disabled={disabled}
              className={inputCls}
              value={value.suburb}
              onChange={(e) => set('suburb', e.target.value)}
              placeholder="Parramatta"
            />
          </div>
          <div>
            <label className={labelCls}>Postcode</label>
            <input
              disabled={disabled}
              className={inputCls}
              value={value.postcode}
              onChange={(e) => set('postcode', e.target.value)}
              placeholder="2150"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>State</label>
            <select disabled={disabled} className={inputCls} value={value.state} onChange={(e) => set('state', e.target.value)}>
              {AU_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select disabled={disabled} className={inputCls} value={value.property_type} onChange={(e) => set('property_type', e.target.value)}>
              {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelCls}>Beds</label>
            <input disabled={disabled} type="number" min={1} max={10} className={inputCls}
              value={value.bedrooms} onChange={(e) => set('bedrooms', +e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Baths</label>
            <input disabled={disabled} type="number" min={1} max={10} className={inputCls}
              value={value.bathrooms} onChange={(e) => set('bathrooms', +e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Cars</label>
            <input disabled={disabled} type="number" min={0} max={10} className={inputCls}
              value={value.car_spaces} onChange={(e) => set('car_spaces', +e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Price ($)</label>
            <input disabled={disabled} type="number" min={0} className={inputCls}
              value={value.purchase_price} onChange={(e) => set('purchase_price', +e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Rent ($/wk)</label>
            <input disabled={disabled} type="number" min={0} className={inputCls}
              value={value.estimated_rent_per_week} onChange={(e) => set('estimated_rent_per_week', +e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Rate (%)</label>
            <input disabled={disabled} type="number" step="0.01" min={0} className={inputCls}
              value={value.interest_rate} onChange={(e) => set('interest_rate', +e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Term (yrs)</label>
            <input disabled={disabled} type="number" min={5} max={30} className={inputCls}
              value={value.loan_term_years} onChange={(e) => set('loan_term_years', +e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  )
}
