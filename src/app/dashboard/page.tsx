'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/items')
      .then((res) => res.json())
      .then((data) => {
        setItems(data)
        setLoading(false)
      })
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm" style={{ color: '#64748B' }}>Loading your collection...</p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

          {/* Recent Items */}
          {totalItems > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-base" style={{ color: '#0F172A' }}>Recent Items</h2>
                <Link
                  href="/items"
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#3B82F6' }}
                >
                  View all →
                </Link>
              </div>
              <div
                className="rounded-2xl overflow-hidden divide-y"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  divideColor: '#F1F5F9',
                }}
              >
                {items.slice(0, 6).map((item) => (
                  <Link key={item.id} href={`/items/${item.id}`}>
                    <div
                      className="flex items-center justify-between px-5 py-3.5 transition-colors"
                      style={{ borderBottom: '1px solid #F8FAFC' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: '#EFF6FF' }}
                        >
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
          )}
        </>
      )}
    </div>
  )
}