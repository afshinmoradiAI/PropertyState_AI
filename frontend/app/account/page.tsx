'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthGuard from '../components/AuthGuard'
import { authHeaders, clearAuth, getUser } from '../lib/auth'

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
    <div className="min-h-screen" style={{ backgroundColor: '#F5EDE3' }}>
      <header className="border-b" style={{ backgroundColor: '#1A0F07', borderColor: 'rgba(196,149,106,0.4)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/" className="text-sm font-semibold" style={{ color: '#C4956A' }}>← Home</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black mb-2" style={{ color: '#2C1A0E' }}>Account</h1>
        <p className="text-sm mb-8" style={{ color: '#8B5E3C' }}>{user?.email}</p>

        <Section title="Export your data">
          <p className="text-sm mb-3" style={{ color: '#4A2C0A' }}>
            Download everything we hold for you as JSON — your profile, plan, current-month usage, and every saved report.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6B3A1F, #C4956A)' }}
          >
            {exporting ? 'Preparing…' : 'Download my data'}
          </button>
        </Section>

        <Section title="Delete account">
          <p className="text-sm mb-3" style={{ color: '#4A2C0A' }}>
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
            style={{ backgroundColor: '#fff', color: '#6B3A1F', border: '1px solid #C4956A' }}
          >
            Sign out
          </button>
        </Section>

        <div className="mt-12 pt-6 border-t text-xs" style={{ borderColor: '#E8D5B7', color: '#A07850' }}>
          <Link href="/privacy" className="underline mr-4">Privacy Policy</Link>
          <Link href="/terms" className="underline">Terms of Service</Link>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6 mb-4 shadow-sm" style={{ backgroundColor: '#fff', border: '1px solid #E8D5B7' }}>
      <h2 className="text-base font-bold mb-3" style={{ color: '#2C1A0E' }}>{title}</h2>
      {children}
    </div>
  )
}
