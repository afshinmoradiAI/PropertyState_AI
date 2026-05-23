'use client'
import { useState } from 'react'
import { SuburbSearchInput } from '../types/suburb'

interface Props {
  onSubmit: (q: SuburbSearchInput) => void
  loading: boolean
}

const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']
const GOALS: { value: SuburbSearchInput['investment_goal']; label: string; sub: string }[] = [
  { value: 'capital_growth', label: 'Capital Growth', sub: 'Long-term value increase' },
  { value: 'cashflow', label: 'Cashflow', sub: 'Positive weekly income' },
  { value: 'balanced', label: 'Balanced', sub: 'Both growth and yield' },
]

export default function SuburbSearchForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<SuburbSearchInput>({
    suburb: '',
    state: 'NSW',
    budget_min: 600000,
    budget_max: 1000000,
    investment_goal: 'balanced',
  })

  function set<K extends keyof SuburbSearchInput>(k: K, v: SuburbSearchInput[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  const inputCls = 'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors' +
    ' border-amber-200 bg-amber-50/30 text-stone-800 placeholder-stone-400 focus:border-amber-600 focus:ring-amber-100'
  const labelCls = 'block text-xs font-semibold uppercase tracking-wide mb-1 text-amber-800'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
        <div>
          <label className={labelCls}>Suburb</label>
          <input
            required
            className={inputCls}
            value={form.suburb}
            onChange={(e) => set('suburb', e.target.value)}
            placeholder="e.g. Parramatta"
          />
        </div>
        <div>
          <label className={labelCls}>State</label>
          <select className={inputCls} value={form.state} onChange={(e) => set('state', e.target.value)}>
            {AU_STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Budget min ($)</label>
          <input type="number" min={0} className={inputCls}
            value={form.budget_min} onChange={(e) => set('budget_min', +e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Budget max ($)</label>
          <input type="number" min={0} className={inputCls}
            value={form.budget_max} onChange={(e) => set('budget_max', +e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Investment Goal</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {GOALS.map((g) => {
            const active = form.investment_goal === g.value
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => set('investment_goal', g.value)}
                className="rounded-lg p-3 text-left transition-all"
                style={{
                  border: active ? '2px solid #6B3A1F' : '1px solid #E8D5B7',
                  backgroundColor: active ? '#FFF8F0' : '#fff',
                }}
              >
                <div className="text-sm font-bold" style={{ color: '#2C1A0E' }}>{g.label}</div>
                <div className="text-[11px] mt-0.5" style={{ color: '#8B5E3C' }}>{g.sub}</div>
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !form.suburb || form.budget_min >= form.budget_max}
        className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: loading ? '#A07850' : 'linear-gradient(135deg, #6B3A1F, #C4956A)' }}
      >
        {loading ? 'Searching the suburb…' : 'Find what to buy →'}
      </button>
    </form>
  )
}
