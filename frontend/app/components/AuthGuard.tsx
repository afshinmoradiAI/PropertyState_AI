'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthed } from '../lib/auth'

interface Props { children: React.ReactNode }

/** Wraps a page — redirects to /sign-in if no token. */
export default function AuthGuard({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isAuthed()) {
      const next = encodeURIComponent(pathname || '/')
      router.replace(`/sign-in?next=${next}`)
    } else {
      setReady(true)
    }
  }, [router, pathname])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
        <p className="text-sm" style={{ color: '#2952A3' }}>Checking sign-in…</p>
      </div>
    )
  }
  return <>{children}</>
}
