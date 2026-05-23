'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const KEY = 'psai_storage_ack'

export default function StorageBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4">
      <div className="max-w-3xl mx-auto rounded-xl p-4 shadow-2xl flex flex-col sm:flex-row gap-3 items-start sm:items-center"
        style={{ background: 'linear-gradient(135deg, #2C1A0E, #6B3A1F)', border: '1px solid #C4956A' }}>
        <p className="text-xs flex-1" style={{ color: '#FFF8F0' }}>
          We use <strong>browser localStorage</strong> (not cookies) to remember your sign-in and model preference. No third-party tracking.{' '}
          <Link href="/privacy" className="underline" style={{ color: '#E8C9A0' }}>Privacy</Link>
        </p>
        <button
          onClick={() => { localStorage.setItem(KEY, '1'); setVisible(false) }}
          className="rounded-lg px-4 py-1.5 text-xs font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #8B5E3C, #C4956A)' }}
        >
          OK
        </button>
      </div>
    </div>
  )
}
