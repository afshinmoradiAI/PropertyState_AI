'use client'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PropertyForm from './components/PropertyForm'
import AnalysisResults from './components/AnalysisResults'
import WhatIfSimulator from './components/WhatIfSimulator'
import UserMenu from './components/UserMenu'
import SettingsDialog from './components/SettingsDialog'
import { authHeaders } from './lib/auth'
import { modelHeader } from './lib/model'
import {
  AnalysisId,
  ALL_ANALYSES,
  PropertyInput,
  RentalYieldResult,
  CashflowResult,
  ROIResult,
  LocationRiskResult,
  TaxDepreciationResult,
  InvestmentPotentialResult,
  NegotiationResult,
  PropertyReport,
  StreamEvent,
} from './types/property'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface PartialResults {
  rentalYield?: RentalYieldResult
  cashflow?: CashflowResult
  roi?: ROIResult
  locationRisk?: LocationRiskResult
  taxDepreciation?: TaxDepreciationResult
  investmentPotential?: InvestmentPotentialResult
  negotiation?: NegotiationResult
  report?: PropertyReport
}

const FEATURES = [
  {
    icon: '📈',
    title: 'Rental Yield',
    desc: 'Gross & net yield, vacancy rate, market rent assessment',
  },
  {
    icon: '💰',
    title: 'Cashflow',
    desc: 'Weekly income vs expenses, positive or negative cashflow',
  },
  {
    icon: '🏆',
    title: 'ROI & Growth',
    desc: '5-year projected value, capital growth & equity',
  },
  {
    icon: '📍',
    title: 'Location Risk',
    desc: 'Suburb score, flood, crime & infrastructure rating',
  },
  {
    icon: '🧾',
    title: 'Tax & Depreciation',
    desc: 'Negative gearing, depreciation schedules & tax benefit',
  },
  {
    icon: '🤝',
    title: 'Negotiation Intel',
    desc: 'Days on market, comparable sales, offer strategy',
  },
]

const STEPS = [
  { num: '01', title: 'Enter Property Details', desc: 'Address, price, rent estimate and loan terms.' },
  { num: '02', title: 'AI Runs the Analysis', desc: 'Multiple AI agents run in parallel across every investment dimension.' },
  { num: '03', title: 'Get Your Verdict', desc: 'A clear BUY / HOLD / AVOID decision with confidence score arrives in seconds.' },
]

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<PartialResults>({})
  const [lastProperty, setLastProperty] = useState<PropertyInput | null>(null)
  const [lastSelected, setLastSelected] = useState<AnalysisId[]>([])
  const [savedReportId, setSavedReportId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showFloatingCTA, setShowFloatingCTA] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  // Show floating "Analyse Now" button after user scrolls past the hero
  useEffect(() => {
    function onScroll() {
      const formTop = formRef.current?.getBoundingClientRect().top ?? 0
      // Show when past hero (~100vh) but hide once the form itself is on screen
      setShowFloatingCTA(window.scrollY > window.innerHeight * 0.6 && formTop > window.innerHeight * 0.3)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function handleSubmit(property: PropertyInput, selected: AnalysisId[] = ALL_ANALYSES) {
    setLoading(true)
    setError(null)
    setResults({})
    setSavedReportId(null)
    setLastProperty(property)
    setLastSelected(selected)

    try {
      const res = await fetch(`${API}/api/property/analyze/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(), ...modelHeader() },
        body: JSON.stringify({ property, selected_analyses: selected }),
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
          const event: StreamEvent = JSON.parse(raw)

          if (event.event === 'error') {
            setError((event.data as { message: string }).message)
            break
          }
          if (event.event === 'rental_yield') setResults(p => ({ ...p, rentalYield: event.data as RentalYieldResult }))
          if (event.event === 'cashflow') setResults(p => ({ ...p, cashflow: event.data as CashflowResult }))
          if (event.event === 'roi') setResults(p => ({ ...p, roi: event.data as ROIResult }))
          if (event.event === 'location_risk') setResults(p => ({ ...p, locationRisk: event.data as LocationRiskResult }))
          if (event.event === 'tax_depreciation') setResults(p => ({ ...p, taxDepreciation: event.data as TaxDepreciationResult }))
          if (event.event === 'investment_potential') setResults(p => ({ ...p, investmentPotential: event.data as InvestmentPotentialResult }))
          if (event.event === 'negotiation') setResults(p => ({ ...p, negotiation: event.data as NegotiationResult }))
          if (event.event === 'complete') setResults(p => ({ ...p, report: event.data as PropertyReport }))
          if (event.event === 'saved') setSavedReportId((event.data as { report_id: string }).report_id)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const hasResults = Object.keys(results).length > 0

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A1628' }}>

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: 'rgba(7,16,32,0.85)', borderColor: 'rgba(212,175,55,0.15)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black transition-transform group-hover:scale-110"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #1B3A6B)' }}>
              🏠
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-black tracking-tight" style={{ color: '#F0F5FF' }}>PropertyState</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: '#2952A3' }}>AI Investment</div>
            </div>
          </Link>

          {/* Center nav — primary tools */}
          <nav className="hidden md:flex items-center gap-1 px-1.5 py-1.5 rounded-xl"
            style={{ backgroundColor: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)' }}>
            {[
              { href: '/library', label: 'Library', icon: '📚' },
              { href: '/suburb', label: 'Suburb', icon: '🌏' },
              { href: '/compare', label: 'Compare', icon: '⚖️' },
              { href: '/pricing', label: 'Pricing', icon: '💎' },
            ].map(({ href, label, icon }) => (
              <Link key={href} href={href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all hover:bg-blue-900/30"
                style={{ color: '#F0D060' }}>
                <span className="text-xs">{icon}</span>
                {label}
              </Link>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all hover:bg-blue-900/30"
              style={{ color: '#D4AF37' }}
              aria-label="Settings"
              title="Settings"
            >
              ⚙️
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ minHeight: '100vh' }}>
        <Image
          src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1920&q=80"
          alt="Australian house"
          fill
          priority
          className="object-cover object-center scale-105"
          style={{ filter: 'brightness(0.35)' }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(160deg, rgba(10,22,40,0.97) 0%, rgba(13,31,60,0.85) 45%, rgba(27,58,107,0.5) 100%)',
        }} />
        <div className="absolute inset-x-0 top-0 h-32" style={{
          background: 'linear-gradient(to bottom, rgba(10,22,40,0.6), transparent)',
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center pt-24 pb-20" style={{ minHeight: '100vh' }}>

          {/* ── LEFT: clear copy ── */}
          <div>
            {/* Tag */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold mb-7"
              style={{ backgroundColor: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)', color: '#F0D060' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
              </span>
              Australian Property Investment Analysis
            </div>

            {/* Crystal-clear headline */}
            <h2 className="font-black leading-[1.05] mb-6" style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)', color: '#F0F5FF' }}>
              Should you buy<br />
              <span style={{
                background: 'linear-gradient(90deg, #D4AF37 0%, #F0D060 50%, #D4AF37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>this property?</span>
            </h2>

            <p className="text-lg leading-relaxed mb-7" style={{ color: '#C8D8F0' }}>
              Paste any Australian property address. Our AI runs a full investment analysis and tells you{' '}
              <span className="font-bold" style={{ color: '#F0F5FF' }}>BUY, HOLD or AVOID</span>{' '}
              — backed by rental yield, cashflow, ROI, location risk, tax benefits and negotiation intel.
            </p>

            {/* "What you do / What you get" steps */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { n: '1', t: 'Paste address' },
                { n: '2', t: 'AI analyses' },
                { n: '3', t: 'Get the verdict' },
              ].map(s => (
                <div key={s.n} className="rounded-xl p-3"
                  style={{ backgroundColor: 'rgba(240,245,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <div className="text-xs font-black mb-1" style={{ color: '#D4AF37' }}>STEP {s.n}</div>
                  <div className="text-sm font-bold" style={{ color: '#F0F5FF' }}>{s.t}</div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={scrollToForm}
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl text-base font-bold transition-all hover:scale-105 hover:shadow-2xl active:scale-95"
                style={{ background: 'linear-gradient(135deg, #1B3A6B 0%, #D4AF37 100%)', color: '#F0F5FF', boxShadow: '0 8px 32px rgba(212,175,55,0.4)' }}
              >
                Analyse My Property — Free
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>

            <p className="text-xs" style={{ color: '#2952A3' }}>
              ✓ No credit card · ✓ Results in seconds · ✓ Save and share reports
            </p>
          </div>

          {/* ── RIGHT: live example showing input → output ── */}
          <div className="relative">
            {/* Input card — what user enters */}
            <div className="rounded-2xl p-5 mb-3"
              style={{ backgroundColor: 'rgba(240,245,255,0.08)', border: '1px solid rgba(212,175,55,0.3)', backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#D4AF37' }}>You enter</span>
                <span className="text-[10px]" style={{ color: '#4A7AC7' }}>Example</span>
              </div>
              <div className="text-base font-bold mb-1" style={{ color: '#F0F5FF' }}>12 Smith St, Parramatta NSW 2150</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: '#C8D8F0' }}>
                <span>🏠 House · 3 bed / 2 bath</span>
                <span>💰 $800,000 · $700/wk rent</span>
              </div>
            </div>

            {/* Animated arrow */}
            <div className="flex justify-center my-2">
              <div className="flex flex-col items-center">
                <div className="text-[10px] uppercase tracking-widest font-bold mb-1 animate-pulse" style={{ color: '#D4AF37' }}>AI analyses</div>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#D4AF37" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>

            {/* Output — verdict card with sample metrics */}
            <div className="rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(240,245,255,0.12) 0%, rgba(212,175,55,0.18) 100%)', border: '1px solid rgba(212,175,55,0.5)', backdropFilter: 'blur(8px)' }}>

              {/* Verdict header */}
              <div className="p-5 border-b" style={{ borderColor: 'rgba(212,175,55,0.25)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: '#D4AF37' }}>You get</div>
                    <div className="text-3xl font-black" style={{ color: '#4ade80' }}>BUY ✓</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black" style={{ color: '#F0F5FF' }}>78</div>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: '#4A7AC7' }}>/100 score</div>
                  </div>
                </div>
              </div>

              {/* Sample metrics */}
              <div className="p-5 grid grid-cols-2 gap-3">
                {[
                  { label: 'Rental Yield', value: '4.55%', tone: '#4ade80' },
                  { label: 'Weekly Cashflow', value: '+$42', tone: '#4ade80' },
                  { label: '5-yr Capital Growth', value: '+$180k', tone: '#F0D060' },
                  { label: 'Location Risk', value: 'Low', tone: '#4ade80' },
                ].map(m => (
                  <div key={m.label} className="rounded-lg p-3"
                    style={{ backgroundColor: 'rgba(10,22,40,0.4)' }}>
                    <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: '#4A7AC7' }}>{m.label}</div>
                    <div className="text-base font-black" style={{ color: m.tone }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Footer note */}
              <div className="px-5 pb-4 text-[11px] flex items-center gap-2" style={{ color: '#4A7AC7' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                Streamed live as each analysis completes — usually within seconds
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: '#1B3A6B' }}>see what you get below</span>
          <div className="w-px h-8 animate-pulse" style={{ background: 'linear-gradient(to bottom, #1B3A6B, transparent)' }} />
        </div>
      </section>

      {/* ── What we analyse ── */}
      <section style={{ backgroundColor: '#071020' }} className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: '#4A7AC7' }}>What's Inside Your Report</p>
            <h2 className="text-4xl font-black mb-3" style={{ color: '#F0F5FF' }}>Everything an investor asks — answered.</h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: '#4A7AC7' }}>
              Six dedicated AI agents work in parallel to cover every angle of the investment decision.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title}
                className="group rounded-2xl p-6 transition-all hover:scale-[1.02]"
                style={{ backgroundColor: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-base font-bold mb-1.5" style={{ color: '#F0D060' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#4A7AC7' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ backgroundColor: '#0A1628' }} className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: '#4A7AC7' }}>Simple Process</p>
            <h2 className="text-4xl font-black" style={{ color: '#F0F5FF' }}>How It Works</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-8 left-1/2 w-full h-px"
                    style={{ background: 'linear-gradient(to right, rgba(212,175,55,0.4), transparent)' }} />
                )}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-lg font-black"
                  style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(27,58,107,0.25))', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                  {step.num}
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: '#F0D060' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#4A7AC7' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Verdict banner ── */}
      <section className="py-16 px-6" style={{ backgroundColor: '#071020' }}>
        <div className="max-w-3xl mx-auto rounded-3xl p-10 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(27,58,107,0.2) 100%)', border: '1px solid rgba(212,175,55,0.25)' }}>
          <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-4" style={{ color: '#4A7AC7' }}>Final Decision</p>
          <div className="flex justify-center gap-4 mb-6">
            {['BUY', 'HOLD', 'AVOID'].map((v, i) => (
              <div key={v} className="px-5 py-2.5 rounded-xl text-sm font-black"
                style={{
                  backgroundColor: i === 0 ? 'rgba(34,197,94,0.15)' : i === 1 ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)',
                  border: `1px solid ${i === 0 ? 'rgba(34,197,94,0.4)' : i === 1 ? 'rgba(234,179,8,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  color: i === 0 ? '#4ade80' : i === 1 ? '#fde047' : '#f87171',
                  opacity: i === 1 ? 1 : 0.5,
                }}>
                {v}
              </div>
            ))}
          </div>
          <h3 className="text-2xl font-black mb-3" style={{ color: '#F0F5FF' }}>
            A clear verdict on every property.
          </h3>
          <p className="text-sm mb-8" style={{ color: '#4A7AC7' }}>
            Not just data — a decision. With confidence score, key strengths and risks laid out plainly.
          </p>
          <button
            onClick={scrollToForm}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #1B3A6B, #D4AF37)', color: '#F0F5FF', boxShadow: '0 8px 32px rgba(212,175,55,0.3)' }}
          >
            Try It Free
          </button>
        </div>
      </section>

      {/* ── Analysis Section ── */}
      <section ref={formRef} className="py-20 px-4" style={{ backgroundColor: '#EEF2FF' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: '#2952A3' }}>Get Started</p>
            <h2 className="text-4xl font-black mb-3" style={{ color: '#0D1F3C' }}>Analyse Your Property</h2>
            <p className="text-sm" style={{ color: '#2952A3' }}>
              Fill in the details below — your AI investment report streams in live as each analysis completes.
            </p>
          </div>

          <div className={`grid gap-8 ${hasResults || loading ? 'grid-cols-1 lg:grid-cols-[460px_1fr]' : 'grid-cols-1 max-w-lg mx-auto'}`}>

            {/* Form Panel */}
            <div className="rounded-2xl shadow-2xl p-7 h-fit lg:sticky lg:top-24"
              style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: 'linear-gradient(135deg, #1B3A6B, #D4AF37)' }}>
                  🏘️
                </div>
                <h3 className="text-base font-bold" style={{ color: '#0D1F3C' }}>Property Details</h3>
              </div>
              <PropertyForm onSubmit={handleSubmit} loading={loading} />
            </div>

            {/* Results Panel */}
            {(hasResults || loading) && (
              <div>
                {error && (
                  <div className="mb-4 rounded-xl p-4 text-sm"
                    style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}>
                    {error}
                  </div>
                )}
                {savedReportId && (
                  <div className="mb-4 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    style={{ background: 'linear-gradient(135deg, #F0F5FF 0%, #EEF2FF 100%)', border: '1px solid #D4AF37' }}>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: '#2952A3' }}>
                        🔗 Shareable link
                      </p>
                      <p className="text-xs" style={{ color: '#1B3A6B' }}>
                        Saved to library — anyone with the link can view this report
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <a href={`/r/${savedReportId}`} target="_blank" rel="noreferrer"
                        className="rounded-lg px-3 py-2 text-xs font-bold"
                        style={{ backgroundColor: '#fff', color: '#1B3A6B', border: '1px solid #D4AF37' }}>
                        Open
                      </a>
                      <button
                        onClick={() => {
                          const url = `${location.origin}/r/${savedReportId}`
                          navigator.clipboard.writeText(url).then(() => {
                            const btn = document.activeElement as HTMLButtonElement
                            const orig = btn.textContent
                            btn.textContent = 'Copied!'
                            setTimeout(() => { btn.textContent = orig }, 1500)
                          })
                        }}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #1B3A6B, #D4AF37)' }}>
                        Copy Link
                      </button>
                    </div>
                  </div>
                )}
                <AnalysisResults
                  rentalYield={results.rentalYield}
                  cashflow={results.cashflow}
                  roi={results.roi}
                  locationRisk={results.locationRisk}
                  taxDepreciation={results.taxDepreciation}
                  investmentPotential={results.investmentPotential}
                  negotiation={results.negotiation}
                  report={results.report}
                  loading={loading}
                />
                {lastProperty && results.investmentPotential && (
                  <div className="mt-4">
                    <WhatIfSimulator
                      baseProperty={lastProperty}
                      onRecalculate={(p) => handleSubmit(p, lastSelected)}
                      loading={loading}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {!hasResults && !loading && (
            <div className="mt-16 text-center" style={{ color: '#4A7AC7' }}>
              <div className="text-6xl mb-5">🏡</div>
              <p className="text-base font-semibold mb-1" style={{ color: '#0D1F3C' }}>Ready when you are.</p>
              <p className="text-sm" style={{ color: '#2952A3' }}>
                Rental yield · Cashflow · ROI · Location risk · BUY / HOLD / AVOID verdict
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Floating "Analyse Now" CTA — appears after hero, disappears at the form ── */}
      <button
        onClick={scrollToForm}
        aria-label="Jump to property form"
        className={`fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-5 py-3.5 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95 ${
          showFloatingCTA ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{
          background: 'linear-gradient(135deg, #1B3A6B, #D4AF37)',
          color: '#F0F5FF',
          boxShadow: '0 12px 32px rgba(10,22,40,0.5), 0 0 0 1px rgba(212,175,55,0.3)',
        }}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-200 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-200" />
        </span>
        Analyse a Property
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* ── Footer ── */}
      <footer className="py-10 px-6" style={{ backgroundColor: '#071020', borderTop: '1px solid rgba(212,175,55,0.15)' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #1B3A6B)' }}>
              🏠
            </div>
            <span className="text-sm font-bold" style={{ color: '#D4AF37' }}>PropertyState AI</span>
          </div>
          <p className="text-xs text-center" style={{ color: '#1B3A6B' }}>
            For informational purposes only. Not financial advice. © 2026 PropertyState AI.
          </p>
          <nav className="flex gap-4">
            {['/library', '/suburb', '/compare'].map(href => (
              <Link key={href} href={href} className="text-xs capitalize transition-colors hover:text-yellow-500"
                style={{ color: '#1B3A6B' }}>
                {href.slice(1)}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}
