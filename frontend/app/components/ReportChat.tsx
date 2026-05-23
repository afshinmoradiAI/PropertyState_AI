'use client'
import { useEffect, useRef, useState } from 'react'
import { PropertyReport } from '../types/property'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props { report: PropertyReport }

const SUGGESTED_QUESTIONS = [
  'Explain the negative gearing math',
  'What if rent went up by $50/week?',
  'What\'s the biggest risk here?',
  'Why this verdict?',
]

export default function ReportChat({ report }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  async function send(text: string) {
    if (!text.trim() || streaming) return
    setError(null)

    const userMsg: Message = { role: 'user', content: text.trim() }
    const history = [...messages]
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    try {
      const res = await fetch(`${API}/api/property/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report,
          history,
          message: userMsg.content,
        }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          const evt = JSON.parse(raw) as { event: string; data: { text?: string; message?: string } }

          if (evt.event === 'chunk' && evt.data.text) {
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last.role === 'assistant') {
                next[next.length - 1] = { ...last, content: last.content + evt.data.text }
              }
              return next
            })
          } else if (evt.event === 'error') {
            setError(evt.data.message ?? 'Chat failed')
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setStreaming(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="rounded-2xl shadow-sm overflow-hidden"
      style={{ backgroundColor: '#fff', border: '1px solid #E8D5B7' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-2"
        style={{ background: 'linear-gradient(135deg, #2C1A0E 0%, #6B3A1F 100%)' }}>
        <span className="text-xl">💬</span>
        <div>
          <h3 className="text-base font-bold" style={{ color: '#FFF8F0' }}>Ask About This Report</h3>
          <p className="text-xs" style={{ color: '#C4956A' }}>
            Conversational follow-up powered by Claude · Report is in context
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: 460, minHeight: 220 }}>
        {messages.length === 0 && !streaming && (
          <div className="text-center py-6">
            <p className="text-sm font-semibold mb-3" style={{ color: '#6B3A1F' }}>Try one of these questions:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:scale-105"
                  style={{ backgroundColor: '#F5EDE3', color: '#6B3A1F', border: '1px solid #E8D5B7' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
              style={
                m.role === 'user'
                  ? { background: 'linear-gradient(135deg, #6B3A1F, #C4956A)', color: '#fff' }
                  : { backgroundColor: '#F5EDE3', color: '#2C1A0E', border: '1px solid #E8D5B7' }
              }
            >
              {m.content}
              {m.role === 'assistant' && streaming && i === messages.length - 1 && (
                <span className="inline-block w-1.5 h-3.5 ml-1 align-text-bottom animate-pulse"
                  style={{ backgroundColor: '#8B5E3C' }} />
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="rounded-lg p-3 text-xs"
            style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}>
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid #F5EDE3' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
          placeholder="Ask a follow-up question…"
          className="flex-1 rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors"
          style={{
            borderColor: '#E8D5B7',
            backgroundColor: '#FFF8F0',
            color: '#2C1A0E',
          }}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="rounded-xl px-5 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #6B3A1F, #C4956A)' }}
        >
          {streaming ? '…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
