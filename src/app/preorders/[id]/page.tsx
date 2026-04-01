'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Preorder = {
  id: string
  name: string
  category: string
  manufacturer: string | null
  edition: string | null
  imageUrl: string | null
  retailer: string | null
  orderReference: string | null
  totalPrice: number | null
  depositPaid: number | null
  expectedDate: string | null
  status: string
  notes: string | null
  convertedItemId: string | null
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; next?: string; nextLabel?: string }> = {
  preordered: { label: 'Preordered', color: '#92400E', bg: '#FEF3C7', next: 'shipped',   nextLabel: 'Mark as Shipped' },
  shipped:    { label: 'Shipped',    color: '#1E40AF', bg: '#DBEAFE', next: 'delivered', nextLabel: 'Mark as Delivered' },
  delivered:  { label: 'Delivered',  color: '#166534', bg: '#DCFCE7' },
  cancelled:  { label: 'Cancelled',  color: '#991B1B', bg: '#FEE2E2' },
}

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export default function PreorderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [preorder, setPreorder] = useState<Preorder | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [converting, setConverting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/preorders/${id}`)
      .then((r) => r.json())
      .then((d) => { setPreorder(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  async function advanceStatus() {
    if (!preorder) return
    const cfg = STATUS_CONFIG[preorder.status]
    if (!cfg.next) return
    setUpdating(true)
    const res = await fetch(`/api/preorders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: cfg.next }),
    })
    const updated = await res.json()
    setPreorder(updated)
    setUpdating(false)
  }

  async function convertToItem() {
    if (!preorder) return
    setConverting(true)
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: preorder.name,
        category: preorder.category,
        manufacturer: preorder.manufacturer,
        edition: preorder.edition,
        imageUrl: preorder.imageUrl,
        condition: 'Excellent',
        paidPrice: preorder.totalPrice,
        notes: preorder.notes,
      }),
    })
    const item = await res.json()
    await fetch(`/api/preorders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ convertedItemId: item.id }),
    })
    router.push(`/items/${item.id}`)
  }

  async function handleDelete() {
    if (!confirm('Delete this preorder? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/preorders/${id}`, { method: 'DELETE' })
    router.push('/preorders')
  }

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm" style={{ color: '#64748B' }}>Loading...</p></div>
  if (!preorder) return <div className="text-center py-20"><p className="text-sm" style={{ color: '#EF4444' }}>Preorder not found.</p></div>

  const cfg = STATUS_CONFIG[preorder.status] ?? STATUS_CONFIG.preordered
  const balance = Math.max(0, Number(preorder.totalPrice ?? 0) - Number(preorder.depositPaid ?? 0))
  const daysUntil = preorder.expectedDate
    ? Math.ceil((new Date(preorder.expectedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/preorders" className="text-sm" style={{ color: '#64748B' }}>← Preorders</Link>
        <span style={{ color: '#E2E8F0' }}>/</span>
        <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{preorder.name}</p>
      </div>

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden mb-5" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
        {preorder.imageUrl && (
          <div className="w-full h-56 overflow-hidden">
            <img src={preorder.imageUrl} alt={preorder.name} className="w-full h-full object-cover object-top" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold mb-1" style={{ color: '#0F172A' }}>{preorder.name}</h1>
              <p className="text-sm" style={{ color: '#64748B' }}>
                {preorder.category}{preorder.manufacturer ? ` · ${preorder.manufacturer}` : ''}
                {preorder.edition ? ` · ${preorder.edition}` : ''}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold px-3 py-1.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>
          </div>

          {/* Status pipeline */}
          <div className="flex items-center gap-1 mb-6">
            {['preordered', 'shipped', 'delivered'].map((s, i) => {
              const statuses = ['preordered', 'shipped', 'delivered']
              const currentIdx = statuses.indexOf(preorder.status)
              const isPast = i <= currentIdx
              const scfg = STATUS_CONFIG[s]
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center mb-1"
                      style={{ background: isPast ? scfg.bg : '#F1F5F9' }}>
                      {isPast && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={scfg.color} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                    <span className="text-xs font-medium" style={{ color: isPast ? scfg.color : '#94A3B8' }}>{scfg.label}</span>
                  </div>
                  {i < 2 && <div className="h-px flex-1 mx-1 mb-4" style={{ background: i < currentIdx ? '#E2E8F0' : '#F1F5F9' }} />}
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {cfg.next && (
              <button onClick={advanceStatus} disabled={updating}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFF' }}>
                {updating ? 'Updating…' : cfg.nextLabel}
              </button>
            )}
            {preorder.status === 'delivered' && !preorder.convertedItemId && (
              <button onClick={convertToItem} disabled={converting}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)', color: '#FFF' }}>
                {converting ? 'Adding…' : '+ Add to Collection'}
              </button>
            )}
            {preorder.convertedItemId && (
              <Link href={`/items/${preorder.convertedItemId}`}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                View in Collection →
              </Link>
            )}
            <Link href={`/preorders/${id}/edit`}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' }}>
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {[
          { label: 'Retailer', value: preorder.retailer },
          { label: 'Order Ref', value: preorder.orderReference },
          { label: 'Expected Date', value: preorder.expectedDate ? new Date(preorder.expectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null },
          { label: 'Days Until Release', value: daysUntil !== null && preorder.status === 'preordered' ? (daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : daysUntil === 0 ? 'Today!' : `${daysUntil} days`) : null },
          { label: 'Total Price', value: preorder.totalPrice ? usd(Number(preorder.totalPrice)) : null },
          { label: 'Deposit Paid', value: preorder.depositPaid ? usd(Number(preorder.depositPaid)) : null },
          { label: 'Balance Due', value: balance > 0 ? usd(balance) : null },
        ].filter((d) => d.value).map((d) => (
          <div key={d.label} className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94A3B8' }}>{d.label}</p>
            <p className="text-sm font-semibold" style={{ color: d.label === 'Balance Due' ? '#EA580C' : d.label === 'Days Until Release' && daysUntil !== null && daysUntil < 0 ? '#EF4444' : '#0F172A' }}>{d.value}</p>
          </div>
        ))}
      </div>

      {preorder.notes && (
        <div className="rounded-2xl p-5 mb-5" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#94A3B8' }}>Notes</p>
          <p className="text-sm" style={{ color: '#475569' }}>{preorder.notes}</p>
        </div>
      )}

      {/* Danger zone */}
      <div className="text-right">
        <button onClick={handleDelete} disabled={deleting}
          className="text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
          style={{ color: '#EF4444', border: '1px solid #FECACA' }}>
          {deleting ? 'Deleting…' : 'Delete Preorder'}
        </button>
      </div>
    </div>
  )
}
