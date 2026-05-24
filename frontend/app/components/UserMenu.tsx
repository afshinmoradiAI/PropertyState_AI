'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthUser, clearAuth, getUser } from '../lib/auth'

export default function UserMenu() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUser(getUser())
    const onChange = () => setUser(getUser())
    window.addEventListener('psai-auth-change', onChange)
    return () => window.removeEventListener('psai-auth-change', onChange)
  }, [])

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (user === null) {
    return (
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #1B3A6B, #D4AF37)', color: '#F0F5FF' }}
      >
        Sign in
      </Link>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all hover:scale-105 ring-2 ring-transparent hover:ring-yellow-400/40"
        style={{ background: 'linear-gradient(135deg, #D4AF37, #1B3A6B)', color: '#fff' }}
        aria-label="Account menu"
      >
        {user.email.charAt(0).toUpperCase()}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-xl shadow-2xl py-2 z-50"
          style={{ backgroundColor: '#0A1628', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          {/* Email header */}
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
            <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: '#4A7AC7' }}>Signed in as</p>
            <p className="text-sm font-bold truncate" style={{ color: '#F0F5FF' }}>{user.email}</p>
          </div>

          {/* Items */}
          <div className="py-1">
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-blue-900/30"
              style={{ color: '#F0D060' }}
            >
              <span>👤</span> Account
            </Link>
            <Link
              href="/library"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-blue-900/30"
              style={{ color: '#F0D060' }}
            >
              <span>📚</span> My Library
            </Link>
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-blue-900/30"
              style={{ color: '#F0D060' }}
            >
              <span>💎</span> Plans & Pricing
            </Link>
          </div>

          {/* Sign out */}
          <div className="border-t pt-1" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
            <button
              onClick={() => { clearAuth(); setOpen(false); router.push('/') }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors hover:bg-red-900/20 text-left"
              style={{ color: '#f87171' }}
            >
              <span>↩</span> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
