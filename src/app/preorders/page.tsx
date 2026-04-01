'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Preorder = {
  id: string
  name: string
  category: string
  manufacturer: string | null
  retailer: string | null
  totalPrice: number | null
  depositPaid: number | null
  expectedDate: string | null
  status: string
  imageUrl: string | null
  convertedItemId: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  preordered: { label: 'Preordered', color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
  shipped:    { label: 'Shipped',    color: '#1E40AF', bg: '#DBEAFE', dot: '#3B82F6' },
  delivered:  { label: 'Delivered',  color: '#166534', bg: '#DCFCE7', dot: '#16A34A' },
  cancelled:  { label: 'Cancelled',  color: '#991B1B', bg: '#FEE2E2', dot: '#EF4444' },
}

const STATUS_ORDER = ['preordered', 'shipped', 'delivered', 'cancelled']

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function PreordersPage() {
  const [preorders, setPreorders] = useState<Preorder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<string>('all')

  useEffect(() => {
    fetch('/api/preorders')
      .then((r) => r.json())
      .then((data) => { setPreorders(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = activeStatus === 'all'
    ? preorders
    : preorders.filter((p) => p.status === activeStatus)

  const totalDeposits = preorders
    .filter((p) => p.status !== 'cancelled')
    .reduce((s, p) => s + Number(p.depositPaid ?? 0), 0)

  const totalBalance = preorders
    .filter((p) => p.status !== 'cancelled' && p.status !== 'delivered')
    .reduce((s, p) => s + Math.max(0, Number(p.totalPrice ?? 0) - Number(p.depositPaid ?? 0)), 0)

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm" style={{ color: '#64748B' }}>Loading preorders...</p></div>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Preorders</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            {preorders.filter(p => p.status !== 'cancelled').length} active orders
          </p>
        </div>
        <Link
          href="/preorders/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFF', boxShadow: '0 2px 8px rgba(59,130,246,0.35)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Preorder
        </Link>
      </div>

      {preorders.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20 text-center" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#FEF3C7' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-base font-semibold mb-1" style={{ color: '#1E293B' }}>No preorders yet</p>
          <p className="text-sm mb-5" style={{ color: '#64748B' }}>Track items you've ordered that haven't arrived yet.</p>
          <Link href="/preorders/new" className="px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFF' }}>
            + Add First Preorder
          </Link>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Active Orders', value: String(preorders.filter(p => p.status !== 'cancelled').length), color: '#3B82F6', bg: '#EFF6FF' },
              { label: 'Deposits Paid', value: usd(totalDeposits), color: '#7C3AED', bg: '#F5F3FF' },
              { label: 'Balance Due', value: usd(totalBalance), color: '#EA580C', bg: '#FFF7ED' },
              { label: 'Delivered', value: String(preorders.filter(p => p.status === 'delivered').length), color: '#16A34A', bg: '#F0FDF4' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{s.label}</p>
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                </div>
                <p className="text-xl font-bold" style={{ color: '#0F172A' }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['all', ...STATUS_ORDER].map((s) => {
              const count = s === 'all' ? preorders.length : preorders.filter(p => p.status === s).length
              const cfg = STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  onClick={() => setActiveStatus(s)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5"
                  style={
                    activeStatus === s
                      ? { background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFF' }
                      : { background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#64748B' }
                  }
                >
                  {cfg && <span className="w-1.5 h-1.5 rounded-full" style={{ background: activeStatus === s ? '#FFF' : cfg.dot }} />}
                  {s === 'all' ? 'All' : cfg.label}
                  <span className="opacity-60">{count}</span>
                </button>
              )
            })}
          </div>

          {/* Preorder list */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {filtered.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: '#94A3B8' }}>No orders in this status.</p>
            ) : (
              filtered.map((p) => {
                const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.preordered
                const balance = Math.max(0, Number(p.totalPrice ?? 0) - Number(p.depositPaid ?? 0))
                const days = p.expectedDate ? daysUntil(p.expectedDate) : null

                return (
                  <Link key={p.id} href={`/preorders/${p.id}`}>
                    <div
                      className="flex items-center gap-4 px-5 py-4 transition-colors"
                      style={{ borderBottom: '1px solid #F8FAFC' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: '#F1F5F9' }}>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover object-top" />
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                          </svg>
                        )}
                      </div>

                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{p.name}</p>
                          {p.convertedItemId && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#F0FDF4', color: '#16A34A' }}>In Collection</span>
                          )}
                        </div>
                        <p className="text-xs truncate" style={{ color: '#64748B' }}>
                          {p.category}{p.manufacturer ? ` · ${p.manufacturer}` : ''}{p.retailer ? ` · ${p.retailer}` : ''}
                        </p>
                      </div>

                      {/* Release date */}
                      {days !== null && p.status === 'preordered' && (
                        <div className="hidden sm:block text-right shrink-0">
                          <p className="text-xs" style={{ color: '#94A3B8' }}>Expected</p>
                          <p className="text-xs font-semibold" style={{ color: days < 0 ? '#EF4444' : days <= 30 ? '#F59E0B' : '#475569' }}>
                            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
                          </p>
                        </div>
                      )}

                      {/* Balance */}
                      {balance > 0 && p.status !== 'cancelled' && (
                        <div className="hidden md:block text-right shrink-0 w-24">
                          <p className="text-xs" style={{ color: '#94A3B8' }}>Balance due</p>
                          <p className="text-sm font-bold" style={{ color: '#EA580C' }}>{usd(balance)}</p>
                        </div>
                      )}

                      {/* Status badge */}
                      <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>

                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" className="shrink-0" aria-hidden="true">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
