'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { getPlan } from '@/lib/plans'
import { LockClosedIcon, ArrowTrendingUpIcon, SparklesIcon } from '@heroicons/react/24/outline'

type Preorder = {
  id: string
  name: string
  category: string
  expectedDate: string | null
  status: string
  retailer: string | null
  totalPrice: number | null
  depositPaid: number | null
}

type Item = {
  id: string
  name: string
  category: string
  manufacturer: string | null
  paidPrice: number | null
  estimatedValue: number | null
}

const statCards = [
  {
    key: 'items',
    label: 'Total Items',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    iconBg: '#EFF6FF',
    iconColor: '#3B82F6',
  },
  {
    key: 'paid',
    label: 'Total Paid',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
  },
  {
    key: 'value',
    label: 'Est. Value',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    iconBg: '#F0FDF4',
    iconColor: '#16A34A',
  },
  {
    key: 'gain',
    label: 'Total Gain',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    iconBg: '#FFF7ED',
    iconColor: '#EA580C',
  },
]

// Distinct colors for category chart bars
const CATEGORY_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
]

export default function DashboardPage() {
  const { data: session } = useSession()
  const [items, setItems] = useState<Item[]>([])
  const [preorders, setPreorders] = useState<Preorder[]>([])
  const [loading, setLoading] = useState(true)

  const userPlan = (session?.user as { plan?: string })?.plan ?? 'free'
  const plan = getPlan(userPlan)
  const hasAnalytics = plan.analytics

  useEffect(() => {
    Promise.all([
      fetch('/api/items').then((r) => r.json()),
      fetch('/api/preorders').then((r) => r.json()),
    ]).then(([itemData, preorderData]) => {
      setItems(Array.isArray(itemData) ? itemData : [])
      setPreorders(Array.isArray(preorderData) ? preorderData : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const usd = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const totalItems = items.length
  const totalPaid = items.reduce((sum, i) => sum + Number(i.paidPrice ?? 0), 0)
  const totalValue = items.reduce((sum, i) => sum + Number(i.estimatedValue ?? 0), 0)
  const totalGain = totalValue - totalPaid

  const statValues: Record<string, { value: string; color: string }> = {
    items: { value: String(totalItems), color: '#0F172A' },
    paid: { value: usd(totalPaid), color: '#0F172A' },
    value: { value: usd(totalValue), color: '#15803D' },
    gain: {
      value: `${totalGain >= 0 ? '+' : '-'}${usd(Math.abs(totalGain))}`,
      color: totalGain >= 0 ? '#15803D' : '#BE123C',
    },
  }

  // Category breakdown for analytics
  const categoryMap: Record<string, { count: number; value: number }> = {}
  items.forEach((item) => {
    if (!categoryMap[item.category]) categoryMap[item.category] = { count: 0, value: 0 }
    categoryMap[item.category].count += 1
    categoryMap[item.category].value += Number(item.estimatedValue ?? 0)
  })
  const categories = Object.entries(categoryMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
  const maxCount = Math.max(...categories.map((c) => c[1].count), 1)

  // Plan limit usage
  const itemLimit = plan.itemLimit
  const itemUsagePct = itemLimit === -1 ? 0 : Math.min((totalItems / itemLimit) * 100, 100)
  const nearLimit = itemLimit !== -1 && totalItems >= itemLimit * 0.8

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            Welcome back — here's your collection at a glance.
          </p>
        </div>
        <Link
          href="/items/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
          style={{
            background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Item
        </Link>
      </div>

      {/* Upgrade banner shown after successful checkout */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('upgraded') === '1' && (
        <div className="mb-6 flex items-center gap-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4">
          <SparklesIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-200">
            Welcome to <span className="font-bold capitalize">{userPlan}</span>! Your plan is now active.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm" style={{ color: '#64748B' }}>Loading your collection...</p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((card) => {
              const stat = statValues[card.key]
              return (
                <div
                  key={card.key}
                  className="rounded-2xl p-5"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
                      {card.label}
                    </p>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: card.iconBg, color: card.iconColor }}
                    >
                      {card.icon}
                    </div>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Item limit progress (shown when not unlimited) */}
          {itemLimit !== -1 && (
            <div
              className={`rounded-xl p-4 mb-6 flex items-center gap-4 ${nearLimit ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs font-medium mb-1.5"
                  style={{ color: nearLimit ? '#92400E' : '#475569' }}>
                  <span>Items used</span>
                  <span>{totalItems} / {itemLimit}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${itemUsagePct}%`,
                      background: nearLimit ? 'linear-gradient(90deg,#F59E0B,#EF4444)' : 'linear-gradient(90deg,#3B82F6,#6366F1)',
                    }}
                  />
                </div>
              </div>
              {nearLimit && (
                <Link
                  href="/pricing"
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: '#F59E0B', color: '#FFFFFF' }}
                >
                  Upgrade
                </Link>
              )}
            </div>
          )}

          {/* Empty state */}
          {totalItems === 0 && (
            <div
              className="rounded-2xl flex flex-col items-center py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: '#EFF6FF' }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" aria-hidden="true">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              </div>
              <p className="text-base font-semibold mb-1" style={{ color: '#1E293B' }}>Your collection is empty</p>
              <p className="text-sm mb-5" style={{ color: '#64748B' }}>Add your first collectible to get started.</p>
              <Link
                href="/items/new"
                className="px-5 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFFFFF' }}
              >
                + Add First Item
              </Link>
            </div>
          )}

          {/* Upcoming preorders strip */}
          {preorders.filter(p => p.status === 'preordered' || p.status === 'shipped').length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-base" style={{ color: '#0F172A' }}>Upcoming Preorders</h2>
                <Link href="/preorders" className="text-sm font-medium" style={{ color: '#3B82F6' }}>View all →</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {preorders
                  .filter(p => p.status === 'preordered' || p.status === 'shipped')
                  .slice(0, 3)
                  .map((p) => {
                    const days = p.expectedDate
                      ? Math.ceil((new Date(p.expectedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null
                    const balance = Math.max(0, Number(p.totalPrice ?? 0) - Number(p.depositPaid ?? 0))
                    const isShipped = p.status === 'shipped'
                    return (
                      <Link key={p.id} href={`/preorders/${p.id}`}>
                        <div className="rounded-xl p-4 flex items-center gap-3 transition-all"
                          style={{ background: '#FFFFFF', border: `1px solid ${isShipped ? '#BFDBFE' : '#FDE68A'}` }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: isShipped ? '#DBEAFE' : '#FEF3C7' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isShipped ? '#3B82F6' : '#F59E0B'} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                              {isShipped
                                ? <><rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 5v3h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>
                                : <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>
                              }
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{p.name}</p>
                            <p className="text-xs" style={{ color: '#64748B' }}>
                              {isShipped ? 'Shipped' : days !== null ? (days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Expected today' : `~${days}d away`) : 'Date TBD'}
                            </p>
                          </div>
                          {balance > 0 && (
                            <span className="text-xs font-bold shrink-0" style={{ color: '#EA580C' }}>
                              {usd(balance)} due
                            </span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
              </div>
            </div>
          )}

          {totalItems > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Items */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-base" style={{ color: '#0F172A' }}>Recent Items</h2>
                  <Link href="/items" className="text-sm font-medium" style={{ color: '#3B82F6' }}>
                    View all →
                  </Link>
                </div>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                >
                  {items.slice(0, 6).map((item) => (
                    <Link key={item.id} href={`/items/${item.id}`}>
                      <div
                        className="flex items-center justify-between px-5 py-3.5 transition-colors"
                        style={{ borderBottom: '1px solid #F8FAFC' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EFF6FF' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" aria-hidden="true">
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>{item.name}</p>
                            <p className="text-xs" style={{ color: '#64748B' }}>
                              {item.category}{item.manufacturer ? ` · ${item.manufacturer}` : ''}
                            </p>
                          </div>
                        </div>
                        {item.estimatedValue != null && (
                          <span className="text-sm font-bold" style={{ color: '#15803D' }}>
                            {usd(Number(item.estimatedValue))}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Analytics panel — locked for free users */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-base" style={{ color: '#0F172A' }}>
                    By Category
                  </h2>
                  {!hasAnalytics && (
                    <span className="text-xs text-blue-500 font-medium flex items-center gap-1">
                      <LockClosedIcon className="w-3.5 h-3.5" /> Collector+
                    </span>
                  )}
                </div>

                {hasAnalytics ? (
                  <div
                    className="rounded-2xl p-5 h-full"
                    style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                  >
                    {categories.length === 0 ? (
                      <p className="text-sm text-slate-400">No data yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {categories.map(([cat, data], i) => (
                          <div key={cat}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-medium text-slate-700 truncate max-w-[120px]">{cat}</span>
                              <span className="text-slate-400 ml-2 shrink-0">
                                {data.count} · {usd(data.value)}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${(data.count / maxCount) * 100}%`,
                                  background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Value breakdown */}
                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Collection ROI</span>
                        <span className={`font-semibold ${totalGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {totalPaid > 0 ? `${((totalGain / totalPaid) * 100).toFixed(1)}%` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> Avg item value
                        </span>
                        <span className="font-semibold text-slate-700">
                          {totalItems > 0 ? usd(totalValue / totalItems) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Locked state */
                  <div
                    className="rounded-2xl p-6 flex flex-col items-center justify-center text-center"
                    style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', minHeight: '220px' }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                      <LockClosedIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">Analytics unlocked on Collector</p>
                    <p className="text-xs text-slate-400 mb-4">
                      See category breakdowns, ROI, and average item values.
                    </p>
                    <Link
                      href="/pricing"
                      className="text-xs font-semibold px-4 py-2 rounded-lg"
                      style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFF' }}
                    >
                      Upgrade to Collector →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
