'use client'
import { useState } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`${API}/api/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } finally {
      setSubmitted(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F5EDE3' }}>
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
            style={{ background: 'linear-gradient(135deg, #C4956A, #8B5E3C)' }}>🏠</div>
          <span className="text-lg font-bold" style={{ color: '#2C1A0E' }}>PropertyState AI</span>
        </Link>

        <div className="rounded-2xl p-8 shadow-xl" style={{ backgroundColor: '#fff', border: '1px solid #E8D5B7' }}>
          <h2 className="text-2xl font-black mb-5" style={{ color: '#2C1A0E' }}>Forgot your password?</h2>

          {submitted ? (
            <div className="text-sm" style={{ color: '#4A2C0A' }}>
              <p className="mb-3">If an account exists for <strong>{email}</strong>, we&apos;ve sent a password-reset link.</p>
              <p className="text-xs" style={{ color: '#8B5E3C' }}>The link expires in 30 minutes.</p>
              <Link href="/sign-in" className="block mt-4 text-sm font-bold underline" style={{ color: '#6B3A1F' }}>← Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm" style={{ color: '#4A2C0A' }}>
                Enter your email and we&apos;ll send you a link to set a new password.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: '#8B5E3C' }}>Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors"
                  style={{ borderColor: '#E8D5B7', backgroundColor: '#FFF8F0', color: '#2C1A0E' }} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6B3A1F, #C4956A)' }}>
                {loading ? '…' : 'Send reset link'}
              </button>
              <p className="text-center text-xs" style={{ color: '#8B5E3C' }}>
                <Link href="/sign-in" className="font-bold underline" style={{ color: '#6B3A1F' }}>← Back to sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
