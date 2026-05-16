'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import PropertyForm from './components/PropertyForm'
import AnalysisResults from './components/AnalysisResults'
import {
  PropertyInput,
  RentalYieldResult,
  CashflowResult,
  ROIResult,
  LocationRiskResult,
  InvestmentPotentialResult,
  PropertyReport,
  StreamEvent,
} from './types/property'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface PartialResults {
  rentalYield?: RentalYieldResult
  cashflow?: CashflowResult
  roi?: ROIResult
  locationRisk?: LocationRiskResult
  investmentPotential?: InvestmentPotentialResult
  report?: PropertyReport
}

const STATS = [
  { value: '5', label: 'AI Agents' },
  { value: 'Real-time', label: 'Streaming Results' },
  { value: 'AU', label: 'Market Focused' },
  { value: 'BUY / HOLD / AVOID', label: 'Clear Verdict' },
]

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<PartialResults>({})
  const formRef = useRef<HTMLDivElement>(null)

  async function handleSubmit(property: PropertyInput) {
    setLoading(true)
    setError(null)
    setResults({})

    try {
      const res = await fetch(`${API}/api/property/analyze/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property }),
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
          const event: StreamEvent = JSON.parse(raw)

          if (event.event === 'error') {
            setError((event.data as { message: string }).message)
            break
          }
          if (event.event === 'rental_yield') setResults(p => ({ ...p, rentalYield: event.data as RentalYieldResult }))
          if (event.event === 'cashflow') setResults(p => ({ ...p, cashflow: event.data as CashflowResult }))
          if (event.event === 'roi') setResults(p => ({ ...p, roi: event.data as ROIResult }))
          if (event.event === 'location_risk') setResults(p => ({ ...p, locationRisk: event.data as LocationRiskResult }))
          if (event.event === 'investment_potential') setResults(p => ({ ...p, investmentPotential: event.data as InvestmentPotentialResult }))
          if (event.event === 'complete') setResults(p => ({ ...p, report: event.data as PropertyReport }))
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const hasResults = Object.keys(results).length > 0

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2C1A0E' }}>

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 border-b border-amber-900/40" style={{ backgroundColor: '#1A0F07' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black"
              style={{ background: 'linear-gradient(135deg, #C4956A, #8B5E3C)' }}>
              🏠
            </div>
            <div>
              <h1 className="text-base font-bold text-amber-50">PropertyState AI</h1>
              <p className="text-xs" style={{ color: '#C4956A' }}>Australian Property Intelligence</p>
            </div>
          </div>
          <button
            onClick={scrollToForm}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #8B5E3C, #C4956A)', color: '#FFF8F0' }}
          >
            Analyse a Property
          </button>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden" style={{ minHeight: '92vh' }}>
        {/* House background image */}
        <Image
          src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1920&q=80"
          alt="Australian house"
          fill
          priority
          className="object-cover object-center"
        />
        {/* Brown gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(26,15,7,0.92) 0%, rgba(44,26,14,0.80) 40%, rgba(107,58,31,0.55) 100%)',
          }}
        />

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col justify-center" style={{ minHeight: '92vh' }}>
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{ backgroundColor: 'rgba(196,149,106,0.2)', border: '1px solid rgba(196,149,106,0.4)', color: '#E8C9A0' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Powered by Claude AI — 5 parallel agents
            </div>

            <h2 className="text-5xl md:text-6xl font-black leading-tight mb-5" style={{ color: '#FFF8F0' }}>
              Know Before<br />
              <span style={{ color: '#C4956A' }}>You Buy.</span>
            </h2>

            <p className="text-lg leading-relaxed mb-8" style={{ color: '#D4B896' }}>
              Get a full AI-powered investment analysis on any Australian property in seconds —
              rental yield, cashflow, ROI, location risk and a clear{' '}
              <strong style={{ color: '#E8C9A0' }}>BUY / HOLD / AVOID</strong> verdict.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={scrollToForm}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-bold transition-all hover:scale-105 hover:shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #8B5E3C, #C4956A)', color: '#FFF8F0' }}
              >
                Analyse a Property
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'rgba(255,248,240,0.08)', color: '#E8C9A0', border: '1px solid rgba(255,248,240,0.15)' }}>
                Free · No login required
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl p-4"
                style={{ backgroundColor: 'rgba(255,248,240,0.06)', border: '1px solid rgba(196,149,106,0.25)' }}>
                <div className="text-lg font-black" style={{ color: '#C4956A' }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: '#A07850' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
          <span className="text-xs" style={{ color: '#A07850' }}>scroll</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#A07850" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── Analysis Section ── */}
      <section ref={formRef} className="py-16 px-4" style={{ backgroundColor: '#F5EDE3' }}>
        <div className="max-w-7xl mx-auto">

          {/* Section heading */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black mb-2" style={{ color: '#2C1A0E' }}>Property Analysis</h2>
            <p className="text-sm" style={{ color: '#8B5E3C' }}>
              Fill in the property details and our AI agents will run a full investment report
            </p>
          </div>

          <div className={`grid gap-8 ${hasResults || loading ? 'grid-cols-1 lg:grid-cols-[440px_1fr]' : 'grid-cols-1 max-w-lg mx-auto'}`}>

            {/* Form Panel */}
            <div className="rounded-2xl shadow-xl p-7 h-fit lg:sticky lg:top-24"
              style={{ backgroundColor: '#fff', border: '1px solid #E8D5B7' }}>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: 'linear-gradient(135deg, #8B5E3C, #C4956A)' }}>
                  🏘️
                </div>
                <h3 className="text-base font-bold" style={{ color: '#2C1A0E' }}>Property Details</h3>
              </div>
              <PropertyForm onSubmit={handleSubmit} loading={loading} />
            </div>

            {/* Results Panel */}
            {(hasResults || loading) && (
              <div>
                {error && (
                  <div className="mb-4 rounded-xl p-4 text-sm"
                    style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}>
                    {error}
                  </div>
                )}
                <AnalysisResults
                  rentalYield={results.rentalYield}
                  cashflow={results.cashflow}
                  roi={results.roi}
                  locationRisk={results.locationRisk}
                  investmentPotential={results.investmentPotential}
                  report={results.report}
                  loading={loading}
                />
              </div>
            )}
          </div>

          {/* Pre-search prompt */}
          {!hasResults && !loading && (
            <div className="mt-14 text-center" style={{ color: '#A07850' }}>
              <p className="text-5xl mb-4">🏡</p>
              <p className="text-sm font-medium">Enter property details above to get your AI investment report.</p>
              <p className="text-xs mt-1" style={{ color: '#C4956A' }}>
                Rental yield · Cashflow · ROI · Location risk · BUY/HOLD/AVOID verdict
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 text-center" style={{ backgroundColor: '#1A0F07', borderTop: '1px solid rgba(196,149,106,0.2)' }}>
        <p className="text-xs" style={{ color: '#6B3A1F' }}>
          © 2026 PropertyState AI · For informational purposes only. Not financial advice.
        </p>
      </footer>
    </div>
  )
}
