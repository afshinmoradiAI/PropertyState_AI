'use client'
import { useState } from 'react'
import Link from 'next/link'
import SuburbSearchForm from '../components/SuburbSearchForm'
import SuburbSearchResults from '../components/SuburbSearchResults'
import { SuburbSearchInput, SuburbSearchResult, SuburbSearchResponse } from '../types/suburb'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function SuburbPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SuburbSearchResult | null>(null)

  async function handleSearch(query: SuburbSearchInput) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`${API}/api/suburb/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const body = (await res.json()) as SuburbSearchResponse
      setResult(body.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EEF2FF' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-blue-900/40" style={{ backgroundColor: '#0A1628' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #2952A3)' }}>
              🔎
            </div>
            <div>
              <h1 className="text-base font-bold text-amber-50">PropertyState AI</h1>
              <p className="text-xs" style={{ color: '#D4AF37' }}>Suburb Search</p>
            </div>
          </Link>
          <Link href="/" className="text-sm font-semibold" style={{ color: '#D4AF37' }}>
            ← Home
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black mb-2" style={{ color: '#0D1F3C' }}>What should I buy in…</h2>
          <p className="text-sm" style={{ color: '#2952A3' }}>
            Tell us a suburb, your budget, and your investment goal. The buyer&apos;s-agent AI will tell you the best property type,
            price band, and pockets to focus on.
          </p>
        </div>

        <div className={`grid gap-6 ${result ? 'lg:grid-cols-[420px_1fr]' : 'max-w-xl mx-auto'}`}>
          {/* Form panel */}
          <div className="rounded-2xl shadow-xl p-7 h-fit lg:sticky lg:top-24"
            style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ background: 'linear-gradient(135deg, #2952A3, #D4AF37)' }}>
                🔎
              </div>
              <h3 className="text-base font-bold" style={{ color: '#0D1F3C' }}>Suburb Brief</h3>
            </div>
            <SuburbSearchForm onSubmit={handleSearch} loading={loading} />
          </div>

          {/* Results panel */}
          {(result || loading || error) && (
            <div>
              {error && (
                <div className="mb-4 rounded-xl p-4 text-sm"
                  style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}>
                  {error}
                </div>
              )}
              {loading && !result && (
                <div className="rounded-2xl p-8 text-center"
                  style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
                  <div className="animate-pulse text-4xl mb-3">🔎</div>
                  <p className="text-sm font-semibold" style={{ color: '#0D1F3C' }}>Researching the suburb…</p>
                  <p className="text-xs mt-1" style={{ color: '#2952A3' }}>Checking medians, growth drivers, demographics</p>
                </div>
              )}
              {result && <SuburbSearchResults result={result} />}
            </div>
          )}
        </div>

        {!result && !loading && !error && (
          <div className="mt-10 text-center" style={{ color: '#4A7AC7' }}>
            <p className="text-5xl mb-3">🗺️</p>
            <p className="text-sm font-medium">Enter a suburb above and choose your investment goal.</p>
          </div>
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
