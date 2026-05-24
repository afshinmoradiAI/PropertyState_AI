'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthGuard from '../components/AuthGuard'
import { authHeaders, clearAuth, getUser } from '../lib/auth'
import { UsageResponse } from '../types/billing'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function AccountPage() {
  return (
    <AuthGuard>
      <AccountView />
    </AuthGuard>
  )
}

function AccountView() {
  const router = useRouter()
  const user = getUser()
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [usage, setUsage] = useState<UsageResponse | null>(null)

  useEffect(() => {
    fetch(`${API}/api/billing/usage`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUsage(d))
      .catch(() => {/* silently — card just won't render */})
  }, [])

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch(`${API}/api/account/export`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `propertystate-export-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Export failed: ' + (err instanceof Error ? err.message : 'unknown'))
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete() {
    const confirm1 = prompt('Type DELETE to permanently remove your account and all reports:')
    if (confirm1 !== 'DELETE') return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/api/account/me`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      clearAuth()
      alert('Account deleted.')
      router.push('/')
    } catch (err) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : 'unknown'))
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EEF2FF' }}>
      <header className="border-b" style={{ backgroundColor: '#0A1628', borderColor: 'rgba(212,175,55,0.4)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/" className="text-sm font-semibold" style={{ color: '#D4AF37' }}>← Home</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black mb-2" style={{ color: '#0D1F3C' }}>Account</h1>
        <p className="text-sm mb-8" style={{ color: '#2952A3' }}>{user?.email}</p>

        {/* Plan & Usage */}
        {usage && (
          <div className="rounded-2xl p-6 mb-4 shadow-sm" style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <h2 className="text-base font-bold mb-1" style={{ color: '#0D1F3C' }}>
                  Plan · <span style={{ color: '#1B3A6B' }}>{usage.plan.label}</span>
                </h2>
                <p className="text-xs" style={{ color: '#2952A3' }}>
                  Current period: {usage.period}
                </p>
              </div>
              <Link
                href="/pricing"
                className="rounded-lg px-3 py-2 text-xs font-bold transition-all hover:scale-105 shrink-0"
                style={{ background: 'linear-gradient(135deg, #1B3A6B, #D4AF37)', color: '#F0F5FF' }}
              >
                {usage.plan.id === 'free' ? 'Upgrade →' : 'Change plan'}
              </Link>
            </div>

            {/* Usage bars */}
            <div className="space-y-3">
              <UsageBar
                label="Analyses"
                used={usage.generations_used}
                limit={usage.generations_limit}
                unit=""
              />
              <UsageBar
                label="AI tokens"
                used={usage.tokens_used}
                limit={usage.tokens_limit}
                unit=""
                formatNum
              />
            </div>
          </div>
        )}

        <Section title="Export your data">
          <p className="text-sm mb-3" style={{ color: '#0D1F3C' }}>
            Download everything we hold for you as JSON — your profile, plan, current-month usage, and every saved report.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1B3A6B, #D4AF37)' }}
          >
            {exporting ? 'Preparing…' : 'Download my data'}
          </button>
        </Section>

        <Section title="Delete account">
          <p className="text-sm mb-3" style={{ color: '#0D1F3C' }}>
            Permanently delete your account and every report you&apos;ve generated. This cannot be undone.
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: '#991B1B' }}
          >
            {deleting ? 'Deleting…' : 'Delete my account'}
          </button>
        </Section>

        <Section title="Sign out">
          <button
            onClick={() => { clearAuth(); router.push('/') }}
            className="rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{ backgroundColor: '#fff', color: '#1B3A6B', border: '1px solid #D4AF37' }}
          >
            Sign out
          </button>
        </Section>

        <div className="mt-12 pt-6 border-t text-xs" style={{ borderColor: '#C4D4F5', color: '#4A7AC7' }}>
          <Link href="/privacy" className="underline mr-4">Privacy Policy</Link>
          <Link href="/terms" className="underline">Terms of Service</Link>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6 mb-4 shadow-sm" style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
      <h2 className="text-base font-bold mb-3" style={{ color: '#0D1F3C' }}>{title}</h2>
      {children}
    </div>
  )
}

function UsageBar({ label, used, limit, unit, formatNum }: {
  label: string; used: number; limit: number; unit: string; formatNum?: boolean
}) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100))
  const isCritical = pct >= 90
  const fmt = (n: number) => formatNum
    ? (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k` : n.toLocaleString())
    : n.toLocaleString()
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-bold" style={{ color: '#0D1F3C' }}>{label}</span>
        <span style={{ color: isCritical ? '#dc2626' : '#2952A3' }}>
          {fmt(used)}{unit} / {fmt(limit)}{unit} ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#EEF2FF' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: isCritical
              ? 'linear-gradient(90deg, #dc2626, #ef4444)'
              : 'linear-gradient(90deg, #1B3A6B, #D4AF37)',
          }}
        />
      </div>
    </div>
  )
}
