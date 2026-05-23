'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthUser, clearAuth, getUser } from '../lib/auth'

export default function UserMenu() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    setUser(getUser())
    const onChange = () => setUser(getUser())
    window.addEventListener('psai-auth-change', onChange)
    return () => window.removeEventListener('psai-auth-change', onChange)
  }, [])

  if (user === null) {
    return (
      <Link
        href="/sign-in"
        className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #8B5E3C, #C4956A)', color: '#FFF8F0' }}
      >
        Sign in
      </Link>
    )
  }

  return (
    <div className="hidden sm:flex items-center gap-3">
      <div className="text-right">
        <p className="text-xs font-bold leading-tight" style={{ color: '#FFF8F0' }}>{user.email}</p>
        <button
          onClick={() => { clearAuth(); router.push('/') }}
          className="text-[10px] underline"
          style={{ color: '#C4956A' }}
        >
          Sign out
        </button>
      </div>
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black"
        style={{ background: 'linear-gradient(135deg, #C4956A, #8B5E3C)', color: '#fff' }}>
        {user.email.charAt(0).toUpperCase()}
      </div>
    </div>
  )
}
