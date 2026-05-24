'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { setAuth } from '../lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function OAuthCompletePage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    const params = new URLSearchParams(hash)
    const token = params.get('token')
    if (!token) {
      setError('Missing token in callback URL')
      return
    }
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((user) => {
        setAuth(token, user)
        window.history.replaceState(null, '', '/oauth-complete')
        router.push('/')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Sign-in failed'))
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
      <p className="text-sm" style={{ color: '#2952A3' }}>
        {error ? `Error: ${error}` : 'Completing sign-in…'}
      </p>
    </div>
  )
}
