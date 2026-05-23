'use client'

const KEY = 'psai_model'

export function getPreferredModel(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(KEY)
}

export function setPreferredModel(modelId: string | null): void {
  if (modelId === null) localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, modelId)
  window.dispatchEvent(new Event('psai-model-change'))
}

export function modelHeader(): Record<string, string> {
  const m = getPreferredModel()
  return m ? { 'X-Model': m } : {}
}

export function formatCost(usdPerM: number): string {
  return `$${usdPerM.toFixed(2)}/M`
}
