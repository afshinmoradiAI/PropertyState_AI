'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlanOut, PlansResponse } from '../types/billing'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// Per-tier marketing copy + feature bullets. Keeps the API response minimal but the page rich.
const TIER_COPY: Record<string, { tagline: string; cta: string; highlight?: boolean; features: string[] }> = {
  free: {
    tagline: 'Try every feature, no card required.',
    cta: 'Start free',
    features: [
      'Haiku model only',
      'Up to 5 full analyses / month',
      'Save & share reports via link',
      'BUY / HOLD / AVOID verdict',
    ],
  },
  pro: {
    tagline: 'For investors actively shortlisting properties.',
    cta: 'Upgrade to Pro',
    highlight: true,
    features: [
      'Haiku + Sonnet models',
      '50 full analyses / month',
      '1.5M tokens / month',
      'Property comparison (up to 3)',
      'PDF export',
      'Chat with your report',
    ],
  },
  lab: {
    tagline: 'For power users and buyer\'s agents.',
    cta: 'Upgrade to Lab',
    features: [
      'Haiku + Sonnet + Opus models',
      '150 full analyses / month',
      '5M tokens / month',
      'Unlimited suburb research',
      'Priority API access',
      'Everything in Pro',
    ],
  },
  enterprise: {
    tagline: 'For agencies, firms and high-volume teams.',
    cta: 'Contact sales',
    features: [
      'All 3 models, defaults to Opus',
      '500 analyses / month',
      '5M tokens / month',
      'Dedicated onboarding',
      'Priority support',
      'Custom integrations',
    ],
  },
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return n.toLocaleString()
}

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanOut[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/api/billing/plans`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((d: PlansResponse) => setPlans(d.plans))
      .catch(e => setError(typeof e === 'string' ? e : 'Failed to load plans'))
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A1628' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: 'rgba(7,16,32,0.85)', borderColor: 'rgba(212,175,55,0.15)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black transition-transform group-hover:scale-110"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #2952A3)' }}>
              🏠
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-black tracking-tight" style={{ color: '#F0F5FF' }}>PropertyState</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: '#2952A3' }}>AI Investment</div>
            </div>
          </Link>
          <Link href="/" className="text-sm font-semibold transition-colors hover:text-amber-300" style={{ color: '#D4AF37' }}>
            ← Back to home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-20 pb-12 text-center">
        <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: '#2952A3' }}>Pricing</p>
        <h1 className="font-black mb-5" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#F0F5FF' }}>
          Simple, transparent <span style={{
            background: 'linear-gradient(90deg, #D4AF37 0%, #F0D060 50%, #D4AF37 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>pricing.</span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: '#D4AF37' }}>
          Start free. Upgrade only when you need more analyses or a smarter model.
        </p>
      </section>

      {/* Plan grid */}
      <section className="px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="rounded-xl p-4 mb-6 text-sm max-w-xl mx-auto text-center"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          {!plans && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="rounded-3xl p-8 h-96 animate-pulse"
                  style={{ backgroundColor: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }} />
              ))}
            </div>
          )}

          {plans && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {plans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          )}

          {/* FAQ / Trust strip */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: '🔒', title: 'Secure billing', desc: 'Payment processed by Stripe. We never see your card details.' },
              { icon: '🔄', title: 'Cancel anytime', desc: 'Month-to-month, no contracts, no surprises. Downgrade or cancel from your account.' },
              { icon: '🇦🇺', title: 'Australian focus', desc: 'Every model is prompted with AU market data. We don\'t do US comparables.' },
            ].map(item => (
              <div key={item.title} className="text-center px-4">
                <div className="text-3xl mb-2">{item.icon}</div>
                <h3 className="text-sm font-bold mb-1" style={{ color: '#F0D060' }}>{item.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#2952A3' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 text-center" style={{ backgroundColor: '#071020', borderTop: '1px solid rgba(212,175,55,0.15)' }}>
        <p className="text-xs" style={{ color: '#1B3A6B' }}>
          © 2026 PropertyState AI · For informational purposes only. Not financial advice.
        </p>
      </footer>
    </div>
  )
}

function PlanCard({ plan }: { plan: PlanOut }) {
  const copy = TIER_COPY[plan.id] ?? { tagline: plan.description, cta: 'Choose plan', features: [] }
  const isHighlight = copy.highlight
  const isAvailable = plan.available

  return (
    <div
      className="relative rounded-3xl p-7 flex flex-col transition-all hover:scale-[1.02]"
      style={{
        backgroundColor: isHighlight ? 'rgba(212,175,55,0.15)' : 'rgba(240,245,255,0.04)',
        border: `1.5px solid ${isHighlight ? 'rgba(212,175,55,0.6)' : 'rgba(212,175,55,0.18)'}`,
        boxShadow: isHighlight ? '0 0 40px rgba(212,175,55,0.2)' : 'none',
      }}
    >
      {isHighlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-black"
          style={{ background: 'linear-gradient(135deg, #D4AF37, #F0D060)', color: '#0D1F3C' }}>
          Most Popular
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <h3 className="text-xl font-black mb-1" style={{ color: '#F0F5FF' }}>{plan.label}</h3>
        <p className="text-xs leading-relaxed" style={{ color: '#2952A3' }}>{copy.tagline}</p>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black" style={{ color: '#F0F5FF' }}>
            {plan.price_aud === 0 ? 'Free' : `A$${plan.price_aud}`}
          </span>
          {plan.price_aud > 0 && (
            <span className="text-xs font-semibold" style={{ color: '#2952A3' }}>/month</span>
          )}
        </div>
      </div>

      {/* Limits row */}
      <div className="grid grid-cols-2 gap-2 mb-6 pb-6 border-b" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
        <div>
          <div className="text-base font-black" style={{ color: '#F0D060' }}>{plan.generations_per_month}</div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: '#2952A3' }}>analyses / mo</div>
        </div>
        <div>
          <div className="text-base font-black" style={{ color: '#F0D060' }}>{fmtNum(plan.tokens_per_month)}</div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: '#2952A3' }}>AI tokens / mo</div>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2.5 mb-6 flex-1">
        {copy.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#C8D8F0' }}>
            <span className="mt-0.5" style={{ color: '#4ade80' }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isAvailable ? (
        <Link
          href={plan.id === 'free' ? '/sign-up' : '/account'}
          className="w-full rounded-xl py-3 text-center text-sm font-bold transition-all hover:scale-105"
          style={{
            background: isHighlight
              ? 'linear-gradient(135deg, #1B3A6B, #D4AF37)'
              : 'rgba(240,245,255,0.08)',
            color: '#F0F5FF',
            border: isHighlight ? 'none' : '1px solid rgba(212,175,55,0.3)',
            boxShadow: isHighlight ? '0 8px 24px rgba(212,175,55,0.3)' : 'none',
          }}
        >
          {copy.cta}
        </Link>
      ) : (
        <button
          disabled
          className="w-full rounded-xl py-3 text-center text-sm font-bold cursor-not-allowed"
          style={{
            backgroundColor: 'rgba(212,175,55,0.08)',
            color: '#1B3A6B',
            border: '1px solid rgba(212,175,55,0.15)',
          }}
        >
          Coming soon
        </button>
      )}
    </div>
  )
}
