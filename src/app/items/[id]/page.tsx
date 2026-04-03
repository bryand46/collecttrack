'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Item = {
  id: string
  name: string
  category: string
  manufacturer: string | null
  edition: string | null
  description: string | null
  condition: string
  paidPrice: number | null
  estimatedValue: number | null
  imageUrl: string | null
  notes: string | null
  createdAt: string
  isFavorite: boolean
}

type AiMarketData = {
  average: number
  low: number
  high: number
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
  sourceLinks: { title: string; url: string; source: string; price: number }[]
  summary: string
}

const conditionColors: Record<string, { bg: string; text: string }> = {
  Mint: { bg: '#DCFCE7', text: '#166534' },
  'Near Mint': { bg: '#DCFCE7', text: '#166534' },
  Excellent: { bg: '#DBEAFE', text: '#1E40AF' },
  Good: { bg: '#E0F2FE', text: '#0369A1' },
  Fair: { bg: '#FEF9C3', text: '#854D0E' },
  Poor: { bg: '#FEE2E2', text: '#991B1B' },
}

const confidenceBadge: Record<string, { bg: string; text: string; label: string }> = {
  high:   { bg: '#DCFCE7', text: '#166534', label: 'High confidence' },
  medium: { bg: '#FEF9C3', text: '#854D0E', label: 'Medium confidence' },
  low:    { bg: '#FEE2E2', text: '#991B1B', label: 'Low confidence' },
}

export default function ItemDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  // AI market value state
  const [showMarket, setShowMarket] = useState(false)
  const [marketLoading, setMarketLoading] = useState(false)
  const [marketData, setMarketData] = useState<AiMarketData | null>(null)
  const [marketError, setMarketError] = useState('')
  const [applyingValue, setApplyingValue] = useState(false)

  // Manual override state
  const [manualValue, setManualValue] = useState('')
  const [savingManual, setSavingManual] = useState(false)

  // Price history
  const [priceHistory, setPriceHistory] = useState<{ id: string; price: number; source: string; createdAt: string }[]>([])

  useEffect(() => {
    fetch(`/api/items/${params.id}`)
      .then((res) => res.json())
      .then((data) => { setItem(data); setLoading(false) })
  }, [params.id])

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/items/${params.id}/price-history`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setPriceHistory(data) })
      .catch(() => {})
  }, [params.id])

  async function handleToggleFavorite() {
    if (!item) return
    const newVal = !item.isFavorite
    setItem({ ...item, isFavorite: newVal })
    try {
      await fetch(`/api/items/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: newVal }),
      })
    } catch {
      setItem({ ...item, isFavorite: !newVal })
    }
  }

  async function handleFindMarketValue() {
    if (!item) return
    setShowMarket(true)
    setMarketLoading(true)
    setMarketError('')
    setMarketData(null)

    const params2 = new URLSearchParams({ name: item.name, itemId: item.id })
    if (item.manufacturer) params2.set('manufacturer', item.manufacturer)
    if (item.condition)    params2.set('condition', item.condition)
    if (item.edition)      params2.set('edition', item.edition)

    try {
      const res = await fetch(`/api/market-value-ai?${params2.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch market data')
      setMarketData(data)
      // Pre-fill manual field with the AI average
      setManualValue(String(data.average))
    } catch (err: any) {
      setMarketError(err.message || 'Could not fetch market data.')
    } finally {
      setMarketLoading(false)
    }
  }

  async function saveHistory(price: number, source: 'search' | 'manual') {
    try {
      const res = await fetch(`/api/items/${params.id}/price-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price, source }),
      })
      const entry = await res.json()
      if (entry?.id) setPriceHistory((h) => [...h, entry])
    } catch {}
  }

  async function handleApplyValue(value: number) {
    if (!item) return
    setApplyingValue(true)
    await fetch(`/api/items/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, estimatedValue: value }),
    })
    setItem({ ...item, estimatedValue: value })
    await saveHistory(value, 'search')
    setApplyingValue(false)
    setShowMarket(false)
    setManualValue('')
  }

  async function handleSaveManual() {
    if (!item || !manualValue) return
    const num = parseFloat(manualValue.replace(/[^0-9.]/g, ''))
    if (isNaN(num) || num <= 0) return
    setSavingManual(true)
    await fetch(`/api/items/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, estimatedValue: num }),
    })
    setItem({ ...item, estimatedValue: num })
    await saveHistory(num, 'manual')
    setSavingManual(false)
    setShowMarket(false)
    setManualValue('')
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/items/${params.id}`, { method: 'DELETE' })
    router.push('/items')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm" style={{ color: '#64748B' }}>Loading...</p>
      </div>
    )
  }
  if (!item) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm" style={{ color: '#64748B' }}>Item not found.</p>
      </div>
    )
  }

  const usd = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const paidNum  = item.paidPrice      != null ? Number(item.paidPrice)      : null
  const valueNum = item.estimatedValue != null ? Number(item.estimatedValue) : null
  const gain     = paidNum != null && valueNum != null ? valueNum - paidNum : null
  const gainPct  = gain != null && paidNum && paidNum > 0
    ? ((gain / paidNum) * 100).toFixed(1) : null

  const cond = conditionColors[item.condition] ?? { bg: '#F1F5F9', text: '#475569' }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/items"
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-5 transition-colors"
        style={{ color: '#3B82F6' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to My Items
      </Link>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        {/* Image */}
        <div className="w-full h-64 flex items-center justify-center overflow-hidden" style={{ background: '#F8FAFC' }}>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover object-top" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-sm" style={{ color: '#CBD5E1' }}>No image yet</span>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4 mb-1">
            <h1 className="text-xl font-bold leading-snug" style={{ color: '#0F172A' }}>
              {item.name}
            </h1>
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              <button
                onClick={handleToggleFavorite}
                className="transition-transform active:scale-125"
                aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <svg width="22" height="22" viewBox="0 0 24 24"
                  fill={item.isFavorite ? '#F59E0B' : 'none'}
                  stroke={item.isFavorite ? '#F59E0B' : '#CBD5E1'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: cond.bg, color: cond.text }}
              >
                {item.condition}
              </span>
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-sm font-medium" style={{ color: '#475569' }}>{item.category}</span>
            {item.manufacturer && (
              <>
                <span style={{ color: '#CBD5E1' }}>·</span>
                <span className="text-sm" style={{ color: '#64748B' }}>{item.manufacturer}</span>
              </>
            )}
          </div>

          {/* Edition badge */}
          {item.edition && (
            <div className="mb-5">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)', color: '#4338CA', border: '1px solid #C7D2FE' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                {item.edition}
              </span>
            </div>
          )}

          {/* Valuation cards */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="rounded-xl p-3 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#94A3B8' }}>Paid</p>
              <p className="text-lg font-bold" style={{ color: '#334155' }}>
                {paidNum != null ? usd(paidNum) : '—'}
              </p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#6EE7B7' }}>Est. Value</p>
              <p className="text-lg font-bold" style={{ color: '#15803D' }}>
                {valueNum != null ? usd(valueNum) : '—'}
              </p>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{
                background: gain != null && gain >= 0 ? '#F0FDF4' : '#FFF1F2',
                border: `1px solid ${gain != null && gain >= 0 ? '#BBF7D0' : '#FECDD3'}`,
              }}
            >
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: gain != null && gain >= 0 ? '#6EE7B7' : '#FDA4AF' }}>
                Gain / Loss
              </p>
              <p className="text-lg font-bold" style={{ color: gain != null && gain >= 0 ? '#15803D' : '#BE123C' }}>
                {gain != null ? `${gain >= 0 ? '+' : '-'}${usd(Math.abs(gain))}` : '—'}
              </p>
              {gainPct && (
                <p className="text-xs font-medium" style={{ color: gain != null && gain >= 0 ? '#15803D' : '#BE123C' }}>
                  {gain != null && gain >= 0 ? '+' : ''}{gainPct}%
                </p>
              )}
            </div>
          </div>

          {/* Value lookup button */}
          <button
            onClick={handleFindMarketValue}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold mb-5 transition-all"
            style={{
              background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
              color: '#065F46',
              border: '1px solid #6EE7B7',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Find Market Value
          </button>

          {/* Details */}
          {item.description && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94A3B8' }}>Description</p>
              <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{item.description}</p>
            </div>
          )}

          {item.notes && (
            <div className="rounded-xl p-4 mb-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#92400E' }}>Personal Notes</p>
              <p className="text-sm leading-relaxed" style={{ color: '#78350F' }}>{item.notes}</p>
            </div>
          )}

          {/* ── Value History ──────────────────────────────────────────── */}
          {priceHistory.length > 0 && (() => {
            const prices  = priceHistory.map((h) => h.price)
            const minP    = Math.min(...prices)
            const maxP    = Math.max(...prices)
            const range   = maxP - minP || 1
            const W = 400, H = 80, PAD = 8
            const pts = priceHistory.map((h, i) => {
              const x = PAD + (i / Math.max(priceHistory.length - 1, 1)) * (W - PAD * 2)
              const y = H - PAD - ((h.price - minP) / range) * (H - PAD * 2)
              return `${x},${y}`
            })
            const first = priceHistory[0]
            const last  = priceHistory[priceHistory.length - 1]
            const trend = last.price >= first.price

            return (
              <div className="mb-5 rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
                    Value History
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold" style={{ color: trend ? '#15803D' : '#BE123C' }}>
                      {trend ? '▲' : '▼'} {usd(Math.abs(last.price - first.price))}
                    </span>
                    <span className="text-xs" style={{ color: '#94A3B8' }}>since first record</span>
                  </div>
                </div>

                {/* Sparkline */}
                {priceHistory.length > 1 && (
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 64 }}>
                    <polyline
                      points={pts.join(' ')}
                      fill="none"
                      stroke={trend ? '#16A34A' : '#DC2626'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Dots */}
                    {priceHistory.map((h, i) => {
                      const [x, y] = pts[i].split(',').map(Number)
                      return (
                        <circle
                          key={h.id}
                          cx={x} cy={y} r="3"
                          fill={h.source === 'search' ? '#3B82F6' : '#F59E0B'}
                          stroke="#FFFFFF" strokeWidth="1.5"
                        />
                      )
                    })}
                  </svg>
                )}

                {/* Log entries */}
                <div className="mt-3 flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                  {[...priceHistory].reverse().map((h) => (
                    <div key={h.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-semibold"
                          style={h.source === 'search'
                            ? { background: '#EFF6FF', color: '#1D4ED8' }
                            : { background: '#FEF9C3', color: '#854D0E' }}
                        >
                          {h.source === 'search' ? 'Search' : 'Manual'}
                        </span>
                        <span style={{ color: '#64748B' }}>
                          {new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <span className="font-semibold" style={{ color: '#0F172A' }}>{usd(h.price)}</span>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-3 pt-2 border-t" style={{ borderColor: '#E2E8F0' }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#3B82F6' }} />
                    <span className="text-xs" style={{ color: '#94A3B8' }}>Market search</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }} />
                    <span className="text-xs" style={{ color: '#94A3B8' }}>Manual entry</span>
                  </div>
                </div>
              </div>
            )
          })()}

          <p className="text-xs mb-6" style={{ color: '#94A3B8' }}>
            Added {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: '#F1F5F9' }}>
            <Link
              href={`/items/${item.id}/edit`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFFFFF' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Item
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{ border: '1px solid #FECDD3', color: '#BE123C', background: '#FFF1F2' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Market Value Modal ─────────────────────────────────────────────── */}
      {showMarket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{ background: '#FFFFFF', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Modal header */}
            <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: '#E2E8F0' }}>
              <div>
                <h2 className="font-bold text-base" style={{ color: '#0F172A' }}>Market Value</h2>
                <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Searches eBay, StockX, Mercari & more</p>
              </div>
              <button
                onClick={() => { setShowMarket(false); setManualValue('') }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ color: '#94A3B8', background: '#F8FAFC' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">

              {/* Loading */}
              {marketLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" aria-hidden="true">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" />
                    <path d="M21 12a9 9 0 00-9-9" />
                  </svg>
                  <p className="text-sm" style={{ color: '#64748B' }}>Searching for prices across the web…</p>
                </div>
              )}

              {/* Error */}
              {marketError && !marketLoading && (
                <div className="rounded-xl p-4 mb-5" style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#BE123C' }}>Could not fetch market data</p>
                  <p className="text-sm" style={{ color: '#9F1239' }}>{marketError}</p>
                  {marketError.includes('API key') && (
                    <p className="text-xs mt-2" style={{ color: '#9F1239' }}>
                      Add <code>BRAVE_SEARCH_API_KEY</code> to your Vercel environment variables.
                    </p>
                  )}
                </div>
              )}

              {/* AI Result */}
              {marketData && !marketLoading && (
                <>
                  {/* Confidence + sources */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {(() => {
                      const badge = confidenceBadge[marketData.confidence] ?? confidenceBadge.medium
                      return (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: badge.bg, color: badge.text }}>
                          {badge.label}
                        </span>
                      )
                    })()}
                    {marketData.sources.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#F1F5F9', color: '#475569' }}>
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Price range */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-xl p-3 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <p className="text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>Low</p>
                      <p className="text-base font-bold" style={{ color: '#334155' }}>{usd(marketData.low)}</p>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                      <p className="text-xs font-medium mb-1" style={{ color: '#6EE7B7' }}>Average</p>
                      <p className="text-xl font-bold" style={{ color: '#15803D' }}>{usd(marketData.average)}</p>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <p className="text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>High</p>
                      <p className="text-base font-bold" style={{ color: '#334155' }}>{usd(marketData.high)}</p>
                    </div>
                  </div>

                  {/* Summary */}
                  {marketData.summary && (
                    <p className="text-sm leading-relaxed mb-4 px-1" style={{ color: '#475569' }}>
                      {marketData.summary}
                    </p>
                  )}

                  {/* Source links */}
                  {marketData.sourceLinks?.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#94A3B8' }}>Sources</p>
                      <div className="flex flex-col gap-2">
                        {marketData.sourceLinks.map((l, i) => (
                          <a
                            key={i}
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between rounded-xl px-4 py-3 transition-all"
                            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                          >
                            <div className="flex-1 min-w-0 mr-3">
                              <p className="text-xs font-medium truncate" style={{ color: '#334155' }}>{l.title}</p>
                              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{l.source}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-sm font-bold" style={{ color: '#15803D' }}>{usd(l.price)}</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Apply average */}
                  <button
                    onClick={() => handleApplyValue(marketData.average)}
                    disabled={applyingValue}
                    className="w-full py-3 rounded-xl text-sm font-semibold mb-5 transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFFFFF' }}
                  >
                    {applyingValue ? 'Saving…' : `Use Average — ${usd(marketData.average)}`}
                  </button>
                </>
              )}

              {/* Manual override — always visible once modal opens (after load) */}
              {!marketLoading && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
                      {marketData ? 'or enter manually' : 'Enter value manually'}
                    </p>
                    <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
                        style={{ color: '#94A3B8' }}
                      >$</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 120"
                        value={manualValue}
                        onChange={(e) => setManualValue(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}
                      />
                    </div>
                    <button
                      onClick={handleSaveManual}
                      disabled={savingManual || !manualValue}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                      style={{ background: '#1E293B', color: '#FFFFFF' }}
                    >
                      {savingManual ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
