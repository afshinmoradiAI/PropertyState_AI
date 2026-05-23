'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AnalysisResults from '../../components/AnalysisResults'
import { PropertyReport } from '../../types/property'
import { ReportDetailResponse } from '../../types/library'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function SharedReportPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [report, setReport] = useState<PropertyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${API}/api/library/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('Report not found — it may have been deleted.')
          throw new Error(`Server error ${res.status}`)
        }
        const body = (await res.json()) as ReportDetailResponse
        if (!cancelled) setReport(body.report)
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5EDE3' }}>
      <header className="sticky top-0 z-50 border-b border-amber-900/40" style={{ backgroundColor: '#1A0F07' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black"
              style={{ background: 'linear-gradient(135deg, #C4956A, #8B5E3C)' }}>
              🏠
            </div>
            <div>
              <h1 className="text-base font-bold text-amber-50">PropertyState AI</h1>
              <p className="text-xs" style={{ color: '#C4956A' }}>Shared Report</p>
            </div>
          </Link>
          <div className="flex gap-3">
            <Link href="/library" className="text-sm font-semibold" style={{ color: '#C4956A' }}>Library</Link>
            <Link href="/" className="text-sm font-semibold" style={{ color: '#C4956A' }}>Analyse →</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading && (
          <div className="rounded-2xl p-12 text-center"
            style={{ backgroundColor: '#fff', border: '1px solid #E8D5B7' }}>
            <p className="text-4xl mb-3 animate-pulse">📄</p>
            <p className="text-sm" style={{ color: '#8B5E3C' }}>Loading report…</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-6 text-center"
            style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
            <p className="text-sm font-bold mb-2" style={{ color: '#991B1B' }}>{error}</p>
            <Link href="/" className="text-sm underline" style={{ color: '#6B3A1F' }}>← Back to home</Link>
          </div>
        )}

        {report && (
          <>
            <div className="mb-6 rounded-2xl p-5"
              style={{ backgroundColor: '#fff', border: '1px solid #E8D5B7' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#A07850' }}>Property</p>
              <h2 className="text-xl font-black" style={{ color: '#2C1A0E' }}>{report.property.address}</h2>
              <p className="text-sm" style={{ color: '#8B5E3C' }}>
                {report.property.suburb}, {report.property.state} {report.property.postcode} · {report.property.property_type} · {report.property.bedrooms}bd / {report.property.bathrooms}ba
              </p>
            </div>

            <AnalysisResults
              rentalYield={report.rental_yield}
              cashflow={report.cashflow}
              roi={report.roi}
              locationRisk={report.location_risk}
              taxDepreciation={report.tax_depreciation}
              investmentPotential={report.investment_potential}
              negotiation={report.negotiation}
              report={report}
              loading={false}
            />
          </>
        )}
      </main>

      <footer className="py-8 px-6 text-center" style={{ backgroundColor: '#1A0F07', borderTop: '1px solid rgba(196,149,106,0.2)' }}>
        <p className="text-xs" style={{ color: '#6B3A1F' }}>
          © 2026 PropertyState AI · For informational purposes only. Not financial advice.
        </p>
      </footer>
    </div>
  )
}
