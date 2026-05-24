'use client'
import { useEffect, useState } from 'react'
import { authHeaders, isAuthed } from '../lib/auth'
import { formatCost, getPreferredModel, setPreferredModel } from '../lib/model'
import { ModelInfo, ModelsResponse, PlanOut, PlansResponse, UsageResponse } from '../types/billing'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Props { open: boolean; onClose: () => void }

export default function SettingsDialog({ open, onClose }: Props) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [plans, setPlans] = useState<PlanOut[]>([])
  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSelectedModel(getPreferredModel())

    Promise.all([
      fetch(`${API}/api/models`).then((r) => r.json() as Promise<ModelsResponse>),
      fetch(`${API}/api/billing/plans`).then((r) => r.json() as Promise<PlansResponse>),
      isAuthed()
        ? fetch(`${API}/api/billing/usage`, { headers: authHeaders() }).then((r) => r.ok ? r.json() as Promise<UsageResponse> : null)
        : Promise.resolve(null),
    ])
      .then(([m, p, u]) => {
        setModels(m.models)
        setPlans(p.plans)
        setUsage(u)
      })
      .catch(() => { /* ignore */ })
  }, [open])

  function handleSelectModel(id: string | null) {
    setSelectedModel(id)
    setPreferredModel(id)
  }

  if (!open) return null

  const tokenPct = usage ? Math.min(100, (usage.tokens_used / usage.tokens_limit) * 100) : 0
  const tokenColor = tokenPct >= 85 ? '#991B1B' : tokenPct >= 60 ? '#92400E' : '#065F46'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ backgroundColor: '#fff', border: '1px solid #C4D4F5' }}>
        <div className="sticky top-0 flex items-center justify-between px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #0D1F3C, #1B3A6B)', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
          <h2 className="text-lg font-bold" style={{ color: '#F0F5FF' }}>Settings</h2>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: '#D4AF37' }}>×</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Usage meter */}
          {usage && (
            <div>
              <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: '#1B3A6B' }}>
                Your usage ({usage.period})
              </h3>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#F0F5FF', border: '1px solid #C4D4F5' }}>
                <div className="flex justify-between text-xs mb-1.5" style={{ color: '#2952A3' }}>
                  <span>Tokens</span>
                  <span><b style={{ color: tokenColor }}>{usage.tokens_used.toLocaleString()}</b> / {usage.tokens_limit.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#EEF2FF' }}>
                  <div style={{ width: `${tokenPct}%`, height: '100%', backgroundColor: tokenColor }} />
                </div>
                <div className="flex justify-between text-xs mt-3 mb-1" style={{ color: '#2952A3' }}>
                  <span>Analyses</span>
                  <span><b style={{ color: '#0D1F3C' }}>{usage.generations_used}</b> / {usage.generations_limit}</span>
                </div>
                <p className="text-[11px] mt-2" style={{ color: '#4A7AC7' }}>
                  Current plan: <b style={{ color: '#0D1F3C' }}>{usage.plan.label}</b> (${usage.plan.price_aud}/mo)
                </p>
              </div>
            </div>
          )}

          {!usage && isAuthed() && (
            <div className="text-sm" style={{ color: '#2952A3' }}>Loading usage…</div>
          )}

          {!isAuthed() && (
            <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: '#F0F5FF', border: '1px solid #C4D4F5', color: '#1B3A6B' }}>
              <b>Sign in</b> to track your monthly usage and save reports to a personal library.
            </div>
          )}

          {/* Model selector */}
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: '#1B3A6B' }}>Model</h3>
            <div className="space-y-2">
              {(() => {
                // Determine which models the current user can actually pick.
                // Logged-out users default to the Free plan. Logged-in users use their plan's allowed_models.
                // Right now only the Free plan is available, so effectively only Haiku is selectable.
                const freePlan = plans.find(p => p.id === 'free')
                const currentPlan = usage?.plan ?? freePlan
                const allowed = new Set(currentPlan?.allowed_models ?? [])
                return (
                  <>
                    <button
                      onClick={() => handleSelectModel(null)}
                      className="w-full text-left rounded-xl p-3 transition-all"
                      style={{
                        border: selectedModel === null ? '2px solid #1B3A6B' : '1px solid #C4D4F5',
                        backgroundColor: selectedModel === null ? '#F0F5FF' : '#fff',
                      }}
                    >
                      <div className="text-sm font-bold" style={{ color: '#0D1F3C' }}>Auto (your plan&apos;s default)</div>
                      <div className="text-xs mt-0.5" style={{ color: '#2952A3' }}>Server picks the best model for your tier.</div>
                    </button>
                    {models.map((m) => {
                      const active = selectedModel === m.id
                      const isAllowed = allowed.has(m.id)
                      return (
                        <button
                          key={m.id}
                          onClick={() => isAllowed && handleSelectModel(m.id)}
                          disabled={!isAllowed}
                          className="w-full text-left rounded-xl p-3 transition-all relative"
                          style={{
                            border: active ? '2px solid #1B3A6B' : '1px solid #C4D4F5',
                            backgroundColor: active ? '#F0F5FF' : '#fff',
                            opacity: isAllowed ? 1 : 0.55,
                            cursor: isAllowed ? 'pointer' : 'not-allowed',
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-bold" style={{ color: '#0D1F3C' }}>{m.label}</div>
                            {!isAllowed && (
                              <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
                                style={{ backgroundColor: '#EEF2FF', color: '#1B3A6B', border: '1px solid #C4D4F5' }}>
                                🔒 Coming Soon
                              </span>
                            )}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: '#2952A3' }}>
                            In: {formatCost(m.input_usd_per_m)} · Out: {formatCost(m.output_usd_per_m)}
                          </div>
                          {!isAllowed && (
                            <div className="text-[11px] mt-1 font-semibold" style={{ color: '#1B3A6B' }}>
                              Requires a paid plan — not available yet
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </>
                )
              })()}
            </div>
            <p className="text-[11px] mt-2" style={{ color: '#4A7AC7' }}>
              Free plan uses <b>Haiku</b> only (5 analyses / month). Sonnet and Opus unlock with paid plans — coming soon.
            </p>
          </div>

          {/* Plans */}
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: '#1B3A6B' }}>Plans</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plans.map((p) => (
                <div key={p.id} className="rounded-xl p-4 relative"
                  style={{
                    backgroundColor: '#fff',
                    border: p.id === usage?.plan.id ? '2px solid #1B3A6B' : '1px solid #C4D4F5',
                  }}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-black" style={{ color: '#0D1F3C' }}>{p.label}</span>
                    <span className="text-sm font-bold" style={{ color: '#1B3A6B' }}>${p.price_aud}/mo</span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: '#2952A3' }}>{p.description}</p>
                  <p className="text-[11px]" style={{ color: '#4A7AC7' }}>
                    {p.tokens_per_month.toLocaleString()} tokens · {p.generations_per_month} analyses / mo
                  </p>
                  {!p.available && (
                    <div className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#EEF2FF', color: '#2952A3' }}>
                      Coming Soon
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
