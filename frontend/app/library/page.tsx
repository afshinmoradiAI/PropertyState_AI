'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthGuard from '../components/AuthGuard'
import { authHeaders } from '../lib/auth'
import { LibraryListResponse, ReportSummary } from '../types/library'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function fmt(n: number) {
  return n.toLocaleString('en-AU', { maximumFractionDigits: 0 })
}

const VERDICT_COLORS: Record<string, { bg: string; text: string }> = {
  BUY: { bg: '#065F46', text: '#fff' },
  HOLD: { bg: '#92400E', text: '#fff' },
  AVOID: { bg: '#991B1B', text: '#fff' },
}

export default function LibraryPage() {
  return (
    <AuthGuard>
      <LibraryView />
    </AuthGuard>
  )
}

function LibraryView() {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/library?limit=100`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const body = (await res.json()) as LibraryListResponse
      setReports(body.reports)
      setTotal(body.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this report? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`${API}/api/library/${id}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`)
      setReports((prev) => prev.filter((r) => r.id !== id))
      setTotal((t) => t - 1)
    } catch (err) {
      alert('Could not delete: ' + (err instanceof Error ? err.message : 'unknown error'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5EDE3' }}>
      <header className="sticky top-0 z-50 border-b border-amber-900/40" style={{ backgroundColor: '#1A0F07' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black"
              style={{ background: 'linear-gradient(135deg, #C4956A, #8B5E3C)' }}>
              📚
            </div>
            <div>
              <h1 className="text-base font-bold text-amber-50">PropertyState AI</h1>
              <p className="text-xs" style={{ color: '#C4956A' }}>Library</p>
            </div>
          </Link>
          <Link href="/" className="text-sm font-semibold" style={{ color: '#C4956A' }}>← Home</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <div>
            <h2 className="text-3xl font-black mb-1" style={{ color: '#2C1A0E' }}>Saved Reports</h2>
            <p className="text-sm" style={{ color: '#8B5E3C' }}>
              {loading ? 'Loading…' : `${total} report${total === 1 ? '' : 's'} saved`}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-xl px-4 py-2 text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #6B3A1F, #C4956A)' }}
          >
            + New Analysis
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl p-4 text-sm"
            style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}>
            {error}
          </div>
        )}

        {!loading && reports.length === 0 && !error && (
          <div className="rounded-2xl p-12 text-center"
            style={{ backgroundColor: '#fff', border: '1px solid #E8D5B7' }}>
            <p className="text-5xl mb-4">📭</p>
            <p className="text-base font-bold mb-1" style={{ color: '#2C1A0E' }}>No reports yet</p>
            <p className="text-sm" style={{ color: '#8B5E3C' }}>Run an analysis on a property — it&apos;ll be saved here automatically.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => {
            const vc = r.verdict ? VERDICT_COLORS[r.verdict] : null
            return (
              <div key={r.id} className="rounded-2xl shadow-sm overflow-hidden flex flex-col"
                style={{ backgroundColor: '#fff', border: '1px solid #E8D5B7' }}>
                <Link href={`/r/${r.id}`} className="block p-5 flex-1 hover:bg-amber-50/30 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {vc && (
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: vc.bg, color: vc.text }}>
                        {r.verdict}
                      </span>
                    )}
                    {r.overall_score !== null && (
                      <span className="text-sm font-black" style={{ color: '#2C1A0E' }}>
                        {r.overall_score}<span className="text-xs font-normal" style={{ color: '#A07850' }}>/10</span>
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold truncate mb-0.5" style={{ color: '#2C1A0E' }}>
                    {r.address}
                  </div>
                  <div className="text-xs mb-3" style={{ color: '#8B5E3C' }}>
                    {r.suburb}, {r.state} {r.postcode} · {r.property_type}
                  </div>
                  <div className="text-sm font-bold" style={{ color: '#6B3A1F' }}>
                    ${fmt(r.purchase_price)}
                  </div>
                  <div className="text-[10px] mt-2" style={{ color: '#A07850' }}>
                    {new Date(r.created_at + 'Z').toLocaleString('en-AU')} · {r.tokens_used.toLocaleString()} tokens
                  </div>
                </Link>
                <div className="flex border-t" style={{ borderColor: '#F5EDE3' }}>
                  <Link
                    href={`/r/${r.id}`}
                    className="flex-1 text-center py-2 text-xs font-semibold transition-colors"
                    style={{ color: '#6B3A1F' }}
                  >
                    Open
                  </Link>
                  <button
                    onClick={async () => {
                      try {
                        const detailRes = await fetch(`${API}/api/library/${r.id}`, { headers: authHeaders() })
                        const body = await detailRes.json()
                        const [{ pdf }, { default: ReportPDF }] = await Promise.all([
                          import('@react-pdf/renderer'),
                          import('../components/ReportPDF'),
                        ])
                        const blob = await pdf(<ReportPDF report={body.report} />).toBlob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `PropertyState-${r.suburb.replace(/\s+/g, '_')}.pdf`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      } catch (err) {
                        alert('PDF generation failed: ' + (err instanceof Error ? err.message : 'unknown'))
                      }
                    }}
                    className="flex-1 py-2 text-xs font-semibold transition-colors"
                    style={{ color: '#6B3A1F', borderLeft: '1px solid #F5EDE3' }}
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => {
                      const url = `${location.origin}/r/${r.id}`
                      navigator.clipboard.writeText(url).then(() => alert('Share link copied!'))
                    }}
                    className="flex-1 py-2 text-xs font-semibold transition-colors"
                    style={{ color: '#6B3A1F', borderLeft: '1px solid #F5EDE3' }}
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="flex-1 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                    style={{ color: '#991B1B', borderLeft: '1px solid #F5EDE3' }}
                  >
                    {deletingId === r.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      <footer className="py-8 px-6 text-center" style={{ backgroundColor: '#1A0F07', borderTop: '1px solid rgba(196,149,106,0.2)' }}>
        <p className="text-xs" style={{ color: '#6B3A1F' }}>
          © 2026 PropertyState AI · For informational purposes only. Not financial advice.
        </p>
      </footer>
    </div>
  )
}
