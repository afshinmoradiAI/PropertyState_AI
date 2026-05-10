'use client'
import { useState } from 'react'
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

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<PartialResults>({})

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">P</div>
          <div>
            <h1 className="text-base font-bold text-slate-800">PropertyState AI</h1>
            <p className="text-xs text-slate-400">Australian Property Investment Analyser</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className={`grid gap-8 ${hasResults || loading ? 'grid-cols-1 lg:grid-cols-[420px_1fr]' : 'grid-cols-1 max-w-xl mx-auto'}`}>

          {/* Form Panel */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-fit lg:sticky lg:top-24">
            <h2 className="text-base font-bold text-slate-800 mb-5">Property Details</h2>
            <PropertyForm onSubmit={handleSubmit} loading={loading} />
          </div>

          {/* Results Panel */}
          {(hasResults || loading) && (
            <div>
              {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
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

        {/* Hero — shown only before first search */}
        {!hasResults && !loading && (
          <div className="mt-12 text-center text-slate-400">
            <p className="text-4xl mb-3">🏘️</p>
            <p className="text-sm">Enter a property above to get a full AI-powered investment analysis.</p>
            <p className="text-xs mt-1">Rental yield · Cashflow · ROI · Location risk · Investment verdict</p>
          </div>
        )}
      </main>
    </div>
  )
}
