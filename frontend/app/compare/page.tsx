'use client'
import { useState } from 'react'
import Link from 'next/link'
import MiniPropertyForm from '../components/MiniPropertyForm'
import ComparisonResults from '../components/ComparisonResults'
import { PropertyInput, PropertyReport } from '../types/property'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const blankProperty = (label: string): PropertyInput => ({
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

export default function ComparePage() {
  const [properties, setProperties] = useState<PropertyInput[]>([
    blankProperty('A'),
    blankProperty('B'),
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reports, setReports] = useState<PartialReport[]>([])

  function updateProperty(i: number, p: PropertyInput) {
    setProperties((prev) => prev.map((q, idx) => (idx === i ? p : q)))
  }

  function addProperty() {
    if (properties.length >= 3) return
    setProperties((prev) => [...prev, blankProperty(String.fromCharCode(65 + prev.length))])
  }

  function removeProperty(i: number) {
    if (properties.length <= 2) return
    setProperties((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleCompare() {
    setLoading(true)
    setError(null)
    setReports(properties.map((p) => ({ property: p })))

    try {
      const res = await fetch(`${API}/api/property/compare/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          const evt = JSON.parse(raw) as { index: number; event: string; data: unknown }

          if (evt.event === 'error') {
            setError(`Property ${String.fromCharCode(65 + evt.index)}: ${(evt.data as { message: string }).message}`)
            continue
          }

          setReports((prev) => prev.map((r, idx) => {
            if (idx !== evt.index) return r
            const key = evt.event as keyof PartialReport
            if (evt.event === 'complete') return { ...r, complete: evt.data as PropertyReport }
            return { ...r, [key]: evt.data }
          }))
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const canCompare = properties.every((p) => p.address && p.suburb && p.postcode)
  const hasResults = reports.length > 0 && reports.some((r) => r.investment_potential)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EEF2FF' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-blue-900/40" style={{ backgroundColor: '#0A1628' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #2952A3)' }}>
              🏠
            </div>
            <div>
              <h1 className="text-base font-bold text-amber-50">PropertyState AI</h1>
              <p className="text-xs" style={{ color: '#D4AF37' }}>Compare Mode</p>
            </div>
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold transition-colors"
            style={{ color: '#D4AF37' }}
          >
            ← Single property
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black mb-2" style={{ color: '#0D1F3C' }}>Compare Properties</h2>
          <p className="text-sm" style={{ color: '#2952A3' }}>
            Analyse 2 or 3 properties side-by-side. Winners are highlighted on each metric.
          </p>
        </div>

        {/* Input panels */}
        <div className={`grid gap-5 mb-6 ${properties.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {properties.map((p, i) => (
            <MiniPropertyForm
              key={i}
              index={i}
              label={String.fromCharCode(65 + i)}
              value={p}
              onChange={(v) => updateProperty(i, v)}
              onRemove={properties.length > 2 ? () => removeProperty(i) : undefined}
              disabled={loading}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-10">
          {properties.length < 3 ? (
            <button
              onClick={addProperty}
              disabled={loading}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
              style={{ backgroundColor: '#fff', color: '#1B3A6B', border: '1px solid #D4AF37' }}
            >
              + Add a 3rd property
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleCompare}
            disabled={loading || !canCompare}
            className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #1B3A6B, #D4AF37)' }}
          >
            {loading ? 'Comparing…' : `Compare ${properties.length} properties →`}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl p-4 text-sm"
            style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}>
            {error}
          </div>
        )}

        {(hasResults || loading) && (
          <ComparisonResults reports={reports} loading={loading} />
        )}
      </main>

      <footer className="py-8 px-6 text-center" style={{ backgroundColor: '#0A1628', borderTop: '1px solid rgba(212,175,55,0.2)' }}>
        <p className="text-xs" style={{ color: '#1B3A6B' }}>
          © 2026 PropertyState AI · For informational purposes only. Not financial advice.
        </p>
      </footer>
    </div>
  )
}
