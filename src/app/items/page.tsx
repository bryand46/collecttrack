'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Item = {
  id: string
  name: string
  category: string
  manufacturer: string | null
  condition: string
  paidPrice: number | null
  estimatedValue: number | null
  imageUrl: string | null
}

const conditionColors: Record<string, { bg: string; text: string }> = {
  Mint: { bg: '#DCFCE7', text: '#166534' },
  'Near Mint': { bg: '#DCFCE7', text: '#166534' },
  Excellent: { bg: '#DBEAFE', text: '#1E40AF' },
  Good: { bg: '#E0F2FE', text: '#0369A1' },
  Fair: { bg: '#FEF9C3', text: '#854D0E' },
  Poor: { bg: '#FEE2E2', text: '#991B1B' },
}

export default function ItemsPage() {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm" style={{ color: '#64748B' }}>Loading your collection...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>My Items</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            {items.length} {items.length === 1 ? 'item' : 'items'} in your collection
          </p>
        </div>
        <Link
          href="/items/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
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

      {/* Empty state */}
      {items.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-20 text-center"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: '#EFF6FF' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <p className="text-base font-semibold" style={{ color: '#1E293B' }}>No items yet</p>
          <p className="text-sm mt-1 mb-5" style={{ color: '#64748B' }}>Start building your collection by adding your first item.</p>
          <Link
            href="/items/new"
            className="px-5 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFFFFF' }}
          >
            + Add First Item
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => {
            const cond = conditionColors[item.condition] ?? { bg: '#F1F5F9', text: '#475569' }
            return (
              <Link key={item.id} href={`/items/${item.id}`}>
                <div
                  className="rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                  }}
                >
                  {/* Image */}
                  <div
                    className="w-full h-44 flex items-center justify-center text-sm font-medium overflow-hidden"
                    style={{ background: '#F8FAFC', color: '#94A3B8' }}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" aria-hidden="true">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span style={{ color: '#CBD5E1', fontSize: '12px' }}>No image</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm leading-tight line-clamp-2" style={{ color: '#0F172A' }}>
                        {item.name}
                      </h3>
                      <span
                        className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: cond.bg, color: cond.text }}
                      >
                        {item.condition}
                      </span>
                    </div>
                    <p className="text-xs mb-3" style={{ color: '#64748B' }}>
                      {item.category}{item.manufacturer ? ` · ${item.manufacturer}` : ''}
                    </p>
                    {item.estimatedValue != null && (
                      <div
                        className="flex items-center justify-between pt-3 border-t"
                        style={{ borderColor: '#F1F5F9' }}
                      >
                        <span className="text-xs" style={{ color: '#94A3B8' }}>Est. Value</span>
                        <span className="text-sm font-bold" style={{ color: '#16A34A' }}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(item.estimatedValue))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
