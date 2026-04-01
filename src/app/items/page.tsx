'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { exportCollection } from '@/lib/exportCollection'

type Item = {
  id: string
  name: string
  category: string
  manufacturer: string | null
  edition: string | null
  condition: string
  paidPrice: number | null
  estimatedValue: number | null
  imageUrl: string | null
  notes: string | null
  acquiredAt: string | null
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

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

// ── Grid Card ────────────────────────────────────────────────────────────────
function GridCard({ item }: { item: Item }) {
  const cond = conditionColors[item.condition] ?? { bg: '#F1F5F9', text: '#475569' }
  return (
    <Link href={`/items/${item.id}`}>
      <div
        className="rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
        style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div className="w-full h-44 flex items-center justify-center overflow-hidden" style={{ background: '#F8FAFC' }}>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover object-top" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
              <span style={{ color: '#CBD5E1', fontSize: '12px' }}>No image</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2" style={{ color: '#0F172A' }}>{item.name}</h3>
            <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: cond.bg, color: cond.text }}>
              {item.condition}
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: '#64748B' }}>
            {item.category}{item.manufacturer ? ` · ${item.manufacturer}` : ''}
          </p>
          {item.estimatedValue != null && (
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: '#F1F5F9' }}>
              <span className="text-xs" style={{ color: '#94A3B8' }}>Est. Value</span>
              <span className="text-sm font-bold" style={{ color: '#16A34A' }}>{usd(Number(item.estimatedValue))}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── List Row ─────────────────────────────────────────────────────────────────
function ListRow({ item }: { item: Item }) {
  const cond = conditionColors[item.condition] ?? { bg: '#F1F5F9', text: '#475569' }
  return (
    <Link href={`/items/${item.id}`}>
      <div
        className="flex items-center gap-4 px-4 py-3 transition-colors"
        style={{ borderBottom: '1px solid #F8FAFC' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: '#F1F5F9' }}>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover object-top" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{item.name}</p>
          <p className="text-xs truncate" style={{ color: '#64748B' }}>
            {item.category}{item.manufacturer ? ` · ${item.manufacturer}` : ''}
          </p>
        </div>

        {/* Condition */}
        <span className="hidden sm:inline-flex shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: cond.bg, color: cond.text }}>
          {item.condition}
        </span>

        {/* Paid */}
        <div className="hidden md:block text-right shrink-0 w-24">
          {item.paidPrice != null ? (
            <>
              <p className="text-xs" style={{ color: '#94A3B8' }}>Paid</p>
              <p className="text-sm font-medium" style={{ color: '#475569' }}>{usd(Number(item.paidPrice))}</p>
            </>
          ) : <span className="text-xs" style={{ color: '#CBD5E1' }}>—</span>}
        </div>

        {/* Est. Value */}
        <div className="text-right shrink-0 w-24">
          {item.estimatedValue != null ? (
            <>
              <p className="text-xs" style={{ color: '#94A3B8' }}>Est. Value</p>
              <p className="text-sm font-bold" style={{ color: '#16A34A' }}>{usd(Number(item.estimatedValue))}</p>
            </>
          ) : <span className="text-xs" style={{ color: '#CBD5E1' }}>—</span>}
        </div>

        {/* Chevron */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" className="shrink-0" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  // Close export dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    fetch('/api/items')
      .then((res) => res.json())
      .then((data) => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(items.map((i) => i.category))).sort()
    return ['All', ...cats]
  }, [items])

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchCat = activeCategory === 'All' || item.category === activeCategory
      const matchSearch =
        search.trim() === '' ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.manufacturer ?? '').toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [items, activeCategory, search])

  const grouped = useMemo(() => {
    if (activeCategory !== 'All' || search.trim() !== '') return null
    const map: Record<string, Item[]> = {}
    items.forEach((item) => {
      if (!map[item.category]) map[item.category] = []
      map[item.category].push(item)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [items, activeCategory, search])

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>My Items</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            {items.length} {items.length === 1 ? 'item' : 'items'} in your collection
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          {items.length > 0 && (
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((o) => !o)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#475569' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {exportOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-52 rounded-xl overflow-hidden z-50"
                  style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                >
                  <div className="px-3 py-2 border-b" style={{ borderColor: '#F1F5F9' }}>
                    <p className="text-xs font-semibold" style={{ color: '#94A3B8' }}>
                      Export {activeCategory === 'All' && search === '' ? 'all' : 'filtered'} {filtered.length} items
                    </p>
                  </div>
                  {[
                    { format: 'xlsx', label: 'Excel (.xlsx)', icon: '📊', desc: 'With summary sheet' },
                    { format: 'csv',  label: 'CSV (.csv)',   icon: '📋', desc: 'Spreadsheet-compatible' },
                    { format: 'json', label: 'JSON (.json)', icon: '🗂️', desc: 'Full data export' },
                  ].map(({ format, label, icon, desc }) => (
                    <button
                      key={format}
                      onClick={() => {
                        exportCollection(filtered, format as 'xlsx' | 'csv' | 'json')
                        setExportOpen(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                      style={{ color: '#1E293B' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      <span className="text-base">{icon}</span>
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs" style={{ color: '#94A3B8' }}>{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Link
            href="/items/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(59,130,246,0.35)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Item
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20 text-center" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#EFF6FF' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <p className="text-base font-semibold" style={{ color: '#1E293B' }}>No items yet</p>
          <p className="text-sm mt-1 mb-5" style={{ color: '#64748B' }}>Start building your collection by adding your first item.</p>
          <Link href="/items/new" className="px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFFFFF' }}>
            + Add First Item
          </Link>
        </div>
      ) : (
        <>
          {/* Toolbar: search + category pills + view toggle */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-shrink-0 w-full sm:w-56">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A' }}
              />
            </div>

            {/* Category pills */}
            <div className="flex gap-2 flex-wrap flex-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={
                    activeCategory === cat
                      ? { background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFFFFF' }
                      : { background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#64748B' }
                  }
                >
                  {cat}
                  {cat !== 'All' && (
                    <span className="ml-1 opacity-60">{items.filter((i) => i.category === cat).length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 flex-shrink-0 p-1 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid view"
                className="p-1.5 rounded-md transition-all"
                style={viewMode === 'grid' ? { background: '#EFF6FF', color: '#3B82F6' } : { color: '#94A3B8' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List view"
                className="p-1.5 rounded-md transition-all"
                style={viewMode === 'list' ? { background: '#EFF6FF', color: '#3B82F6' } : { color: '#94A3B8' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Grouped view (All + no search) */}
          {grouped ? (
            <div className="space-y-10">
              {grouped.map(([category, catItems]) => (
                <div key={category}>
                  {/* Category header */}
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="font-bold text-base" style={{ color: '#0F172A' }}>{category}</h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                      {catItems.length} {catItems.length === 1 ? 'item' : 'items'}
                    </span>
                    <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
                    <span className="text-xs font-semibold" style={{ color: '#16A34A' }}>
                      {usd(catItems.reduce((s, i) => s + Number(i.estimatedValue ?? 0), 0))}
                    </span>
                  </div>

                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {catItems.map((item) => <GridCard key={item.id} item={item} />)}
                    </div>
                  ) : (
                    <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      {catItems.map((item) => <ListRow key={item.id} item={item} />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Flat filtered view */
            filtered.length === 0 ? (
              <div className="text-center py-16" style={{ color: '#94A3B8' }}>
                <p className="text-sm">No items match your search.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((item) => <GridCard key={item.id} item={item} />)}
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {filtered.map((item) => <ListRow key={item.id} item={item} />)}
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
