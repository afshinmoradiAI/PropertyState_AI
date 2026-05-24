'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { setAuth } from '../lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/auth/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail?.title || `Error ${res.status}`)
      }
      const { access_token } = await res.json()
      const me = await (await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${access_token}` } })).json()
      setAuth(access_token, me)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#EEF2FF' }}>
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #2952A3)' }}>🏠</div>
          <span className="text-lg font-bold" style={{ color: '#0D1F3C' }}>PropertyState AI</span>
        </Link>

        <form onSubmit={handleSubmit} className="rounded-2xl p-8 shadow-xl space-y-5"
          style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
          <h2 className="text-2xl font-black" style={{ color: '#0D1F3C' }}>Set a new password</h2>

          {!token && (
            <div className="rounded-lg p-3 text-sm"
              style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}>
              Missing reset token. Make sure you opened the full link from your email.
            </div>
          )}
          {error && (
            <div className="rounded-lg p-3 text-sm"
              style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: '#2952A3' }}>New password</label>
            <input type="password" required autoComplete="new-password" minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors"
              style={{ borderColor: '#C4D4F5', backgroundColor: '#F0F5FF', color: '#0D1F3C' }} />
            <p className="text-[11px] mt-1" style={{ color: '#4A7AC7' }}>Minimum 8 characters.</p>
          </div>

          <button type="submit" disabled={loading || !token}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1B3A6B, #D4AF37)' }}>
            {loading ? '…' : 'Set password and sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
