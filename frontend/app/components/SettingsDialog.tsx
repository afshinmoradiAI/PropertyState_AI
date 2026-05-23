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
        style={{ backgroundColor: '#fff', border: '1px solid #E8D5B7' }}>
        <div className="sticky top-0 flex items-center justify-between px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #2C1A0E, #6B3A1F)', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
          <h2 className="text-lg font-bold" style={{ color: '#FFF8F0' }}>Settings</h2>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: '#C4956A' }}>×</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Usage meter */}
          {usage && (
            <div>
              <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: '#6B3A1F' }}>
                Your usage ({usage.period})
              </h3>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#FFF8F0', border: '1px solid #E8D5B7' }}>
                <div className="flex justify-between text-xs mb-1.5" style={{ color: '#8B5E3C' }}>
                  <span>Tokens</span>
                  <span><b style={{ color: tokenColor }}>{usage.tokens_used.toLocaleString()}</b> / {usage.tokens_limit.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F5EDE3' }}>
                  <div style={{ width: `${tokenPct}%`, height: '100%', backgroundColor: tokenColor }} />
                </div>
                <div className="flex justify-between text-xs mt-3 mb-1" style={{ color: '#8B5E3C' }}>
                  <span>Analyses</span>
                  <span><b style={{ color: '#2C1A0E' }}>{usage.generations_used}</b> / {usage.generations_limit}</span>
                </div>
                <p className="text-[11px] mt-2" style={{ color: '#A07850' }}>
                  Current plan: <b style={{ color: '#2C1A0E' }}>{usage.plan.label}</b> (${usage.plan.price_aud}/mo)
                </p>
              </div>
            </div>
          )}

          {!usage && isAuthed() && (
            <div className="text-sm" style={{ color: '#8B5E3C' }}>Loading usage…</div>
          )}

          {!isAuthed() && (
            <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: '#FFF8F0', border: '1px solid #E8D5B7', color: '#6B3A1F' }}>
              <b>Sign in</b> to track your monthly usage and save reports to a personal library.
            </div>
          )}

          {/* Model selector */}
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: '#6B3A1F' }}>Model</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleSelectModel(null)}
                className="w-full text-left rounded-xl p-3 transition-all"
                style={{
                  border: selectedModel === null ? '2px solid #6B3A1F' : '1px solid #E8D5B7',
                  backgroundColor: selectedModel === null ? '#FFF8F0' : '#fff',
                }}
              >
                <div className="text-sm font-bold" style={{ color: '#2C1A0E' }}>Auto (your plan&apos;s default)</div>
                <div className="text-xs mt-0.5" style={{ color: '#8B5E3C' }}>Server picks the best model for your tier.</div>
              </button>
              {models.map((m) => {
                const active = selectedModel === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModel(m.id)}
                    className="w-full text-left rounded-xl p-3 transition-all"
                    style={{
                      border: active ? '2px solid #6B3A1F' : '1px solid #E8D5B7',
                      backgroundColor: active ? '#FFF8F0' : '#fff',
                    }}
                  >
                    <div className="text-sm font-bold" style={{ color: '#2C1A0E' }}>{m.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#8B5E3C' }}>
                      In: {formatCost(m.input_usd_per_m)} · Out: {formatCost(m.output_usd_per_m)}
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] mt-2" style={{ color: '#A07850' }}>
              If your plan doesn&apos;t allow the model you pick, the server falls back to your plan&apos;s default.
            </p>
          </div>

          {/* Plans */}
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: '#6B3A1F' }}>Plans</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plans.map((p) => (
                <div key={p.id} className="rounded-xl p-4 relative"
                  style={{
                    backgroundColor: '#fff',
                    border: p.id === usage?.plan.id ? '2px solid #6B3A1F' : '1px solid #E8D5B7',
                  }}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-black" style={{ color: '#2C1A0E' }}>{p.label}</span>
                    <span className="text-sm font-bold" style={{ color: '#6B3A1F' }}>${p.price_aud}/mo</span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: '#8B5E3C' }}>{p.description}</p>
                  <p className="text-[11px]" style={{ color: '#A07850' }}>
                    {p.tokens_per_month.toLocaleString()} tokens · {p.generations_per_month} analyses / mo
                  </p>
                  {!p.available && (
                    <div className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#F5EDE3', color: '#8B5E3C' }}>
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
