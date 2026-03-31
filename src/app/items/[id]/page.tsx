'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Item = {
  id: string
  name: string
  category: string
  manufacturer: string | null
  description: string | null
  condition: string
  paidPrice: number | null
  estimatedValue: number | null
  imageUrl: string | null
  notes: string | null
  createdAt: string
}

const conditionColors: Record<string, { bg: string; text: string }> = {
  Mint: { bg: '#DCFCE7', text: '#166534' },
  'Near Mint': { bg: '#DCFCE7', text: '#166534' },
  Excellent: { bg: '#DBEAFE', text: '#1E40AF' },
  Good: { bg: '#E0F2FE', text: '#0369A1' },
  Fair: { bg: '#FEF9C3', text: '#854D0E' },
  Poor: { bg: '#FEE2E2', text: '#991B1B' },
}

export default function ItemDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/items/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setItem(data)
        setLoading(false)
      })
  }, [params.id])

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

  const paidNum = item.paidPrice != null ? Number(item.paidPrice) : null
  const valueNum = item.estimatedValue != null ? Number(item.estimatedValue) : null

  const gain = paidNum != null && valueNum != null ? valueNum - paidNum : null
  const gainPct =
    gain != null && paidNum && paidNum > 0
      ? ((gain / paidNum) * 100).toFixed(1)
      : null

  const cond = conditionColors[item.condition] ?? { bg: '#F1F5F9', text: '#475569' }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
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
        <div
          className="w-full h-64 flex items-center justify-center overflow-hidden"
          style={{ background: '#F8FAFC' }}
        >
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
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-xl font-bold leading-snug" style={{ color: '#0F172A' }}>
              {item.name}
            </h1>
            <span
              className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full mt-0.5"
              style={{ background: cond.bg, color: cond.text }}
            >
              {item.condition}
            </span>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm font-medium" style={{ color: '#475569' }}>{item.category}</span>
            {item.manufacturer && (
              <>
                <span style={{ color: '#CBD5E1' }}>·</span>
                <span className="text-sm" style={{ color: '#64748B' }}>{item.manufacturer}</span>
              </>
            )}
          </div>

          {/* Valuation cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#94A3B8' }}>Paid</p>
              <p className="text-lg font-bold" style={{ color: '#334155' }}>
                {paidNum != null ? usd(paidNum) : '—'}
              </p>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
            >
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
                {gain != null
                  ? `${gain >= 0 ? '+' : '-'}${usd(Math.abs(gain))}`
                  : '—'}
              </p>
              {gainPct && (
                <p className="text-xs font-medium" style={{ color: gain != null && gain >= 0 ? '#15803D' : '#BE123C' }}>
                  {gain != null && gain >= 0 ? '+' : ''}{gainPct}%
                </p>
              )}
            </div>
          </div>

          {/* Details */}
          {item.description && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94A3B8' }}>Description</p>
              <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{item.description}</p>
            </div>
          )}

          {item.notes && (
            <div
              className="rounded-xl p-4 mb-4"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#92400E' }}>Personal Notes</p>
              <p className="text-sm leading-relaxed" style={{ color: '#78350F' }}>{item.notes}</p>
            </div>
          )}

          <p className="text-xs mb-6" style={{ color: '#94A3B8' }}>
            Added {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Actions */}
          <div
            className="flex items-center gap-3 pt-4 border-t"
            style={{ borderColor: '#F1F5F9' }}
          >
            <Link
              href={`/items/${item.id}/edit`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                color: '#FFFFFF',
              }}
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
              style={{
                border: '1px solid #FECDD3',
                color: '#BE123C',
                background: '#FFF1F2',
              }}
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
    </div>
  )
}
