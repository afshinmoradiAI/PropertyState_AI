'use client'
import { useState, useEffect } from 'react'
import { PropertyInput } from '../types/property'

interface Props {
  baseProperty: PropertyInput
  onRecalculate: (updated: PropertyInput) => void
  loading: boolean
}

export default function WhatIfSimulator({ baseProperty, onRecalculate, loading }: Props) {
  const [price, setPrice] = useState(baseProperty.purchase_price)
  const [rate, setRate] = useState(baseProperty.interest_rate)
  const [rent, setRent] = useState(baseProperty.estimated_rent_per_week)

  useEffect(() => {
    setPrice(baseProperty.purchase_price)
    setRate(baseProperty.interest_rate)
    setRent(baseProperty.estimated_rent_per_week)
  }, [baseProperty])

  const hasChanged =
    price !== baseProperty.purchase_price ||
    rate !== baseProperty.interest_rate ||
    rent !== baseProperty.estimated_rent_per_week

  const fmtAUD = (n: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)

  function handleRun() {
    onRecalculate({
      ...baseProperty,
      purchase_price: price,
      interest_rate: rate,
      estimated_rent_per_week: rent,
    })
  }

  function reset() {
    setPrice(baseProperty.purchase_price)
    setRate(baseProperty.interest_rate)
    setRent(baseProperty.estimated_rent_per_week)
  }

  // Slider bounds — ±25% on price/rent, fixed range on rate
  const priceMin = Math.round(baseProperty.purchase_price * 0.75 / 1000) * 1000
  const priceMax = Math.round(baseProperty.purchase_price * 1.25 / 1000) * 1000
  const rentMin = Math.max(50, Math.round(baseProperty.estimated_rent_per_week * 0.7))
  const rentMax = Math.round(baseProperty.estimated_rent_per_week * 1.3)

  return (
    <div className="rounded-2xl shadow-sm p-6"
      style={{
        background: 'linear-gradient(135deg, #fff 0%, #FAF3E8 100%)',
        border: '1px solid #C4D4F5',
      }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">🎚️</span>
        <h3 className="font-bold" style={{ color: '#0D1F3C' }}>What-if Simulator</h3>
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ backgroundColor: '#EEF2FF', color: '#2952A3' }}>
          Tweak & re-run
        </span>
      </div>
      <p className="text-xs mb-5" style={{ color: '#2952A3' }}>
        Move the sliders to see how the verdict changes with different numbers.
      </p>

      <div className="space-y-4">
        {/* Purchase Price */}
        <SliderRow
          label="Purchase Price"
          value={fmtAUD(price)}
          original={fmtAUD(baseProperty.purchase_price)}
          changed={price !== baseProperty.purchase_price}
        >
          <input
            type="range"
            min={priceMin}
            max={priceMax}
            step={5000}
            value={price}
            onChange={(e) => setPrice(+e.target.value)}
            disabled={loading}
            className="w-full accent-yellow-600"
          />
        </SliderRow>

        {/* Interest Rate */}
        <SliderRow
          label="Interest Rate"
          value={`${rate.toFixed(2)}%`}
          original={`${baseProperty.interest_rate.toFixed(2)}%`}
          changed={rate !== baseProperty.interest_rate}
        >
          <input
            type="range"
            min={3}
            max={12}
            step={0.05}
            value={rate}
            onChange={(e) => setRate(+e.target.value)}
            disabled={loading}
            className="w-full accent-yellow-600"
          />
        </SliderRow>

        {/* Weekly Rent */}
        <SliderRow
          label="Weekly Rent"
          value={fmtAUD(rent) + '/wk'}
          original={fmtAUD(baseProperty.estimated_rent_per_week) + '/wk'}
          changed={rent !== baseProperty.estimated_rent_per_week}
        >
          <input
            type="range"
            min={rentMin}
            max={rentMax}
            step={5}
            value={rent}
            onChange={(e) => setRent(+e.target.value)}
            disabled={loading}
            className="w-full accent-yellow-600"
          />
        </SliderRow>
      </div>

      <div className="flex flex-wrap gap-3 mt-5">
        <button
          type="button"
          disabled={!hasChanged || loading}
          onClick={handleRun}
          className="flex-1 min-w-[200px] rounded-xl py-3 px-4 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: !hasChanged || loading
              ? '#4A7AC7'
              : 'linear-gradient(135deg, #1B3A6B, #D4AF37)'
          }}
        >
          {loading ? 'Re-analysing…' : hasChanged ? 'Re-analyse with new values →' : 'Move a slider to re-run'}
        </button>
        {hasChanged && !loading && (
          <button
            type="button"
            onClick={reset}
            className="rounded-xl py-3 px-4 text-sm font-semibold transition-all"
            style={{
              backgroundColor: '#EEF2FF',
              color: '#1B3A6B',
              border: '1px solid #C4D4F5',
            }}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

function SliderRow({
  label, value, original, changed, children,
}: {
  label: string
  value: string
  original: string
  changed: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#2952A3' }}>
          {label}
        </label>
        <div className="flex items-baseline gap-2">
          {changed && (
            <span className="text-xs line-through" style={{ color: '#4A7AC7' }}>
              {original}
            </span>
          )}
          <span className="text-sm font-bold" style={{ color: changed ? '#1B3A6B' : '#0D1F3C' }}>
            {value}
          </span>
        </div>
      </div>
      {children}
    </div>
  )
}
