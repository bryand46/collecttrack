'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CATEGORY_GROUPS } from '@/lib/categories'

const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap((g) => g.categories).sort()

export default function NewPreorderPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    category: '',
    manufacturer: '',
    edition: '',
    imageUrl: '',
    retailer: '',
    orderReference: '',
    totalPrice: '',
    depositPaid: '',
    expectedDate: '',
    status: 'preordered',
    notes: '',
  })

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.category) { setError('Name and category are required.'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/preorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          totalPrice: form.totalPrice ? Number(form.totalPrice) : null,
          depositPaid: form.depositPaid ? Number(form.depositPaid) : null,
          expectedDate: form.expectedDate || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed to save') }
      router.push('/preorders')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/preorders" className="text-sm" style={{ color: '#64748B' }}>← Preorders</Link>
        <span style={{ color: '#E2E8F0' }}>/</span>
        <h1 className="text-xl font-bold" style={{ color: '#0F172A' }}>Add Preorder</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Item info */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: '#94A3B8' }}>Item Details</h2>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Item Name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} required
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" placeholder="e.g. Jill Valentine DX Ver."
              style={{ border: '1px solid #E2E8F0', color: '#0F172A' }} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Category *</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ border: '1px solid #E2E8F0', color: form.category ? '#0F172A' : '#94A3B8' }}>
                <option value="">Select category</option>
                {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Manufacturer</label>
              <input value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" placeholder="e.g. Prime 1 Studio"
                style={{ border: '1px solid #E2E8F0', color: '#0F172A' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Edition / Variant</label>
              <input value={form.edition} onChange={(e) => set('edition', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" placeholder="e.g. Deluxe, Exclusive"
                style={{ border: '1px solid #E2E8F0', color: '#0F172A' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Image URL</label>
              <input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" placeholder="https://..."
                style={{ border: '1px solid #E2E8F0', color: '#0F172A' }} />
            </div>
          </div>
        </div>

        {/* Order info */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: '#94A3B8' }}>Order Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Retailer / Store</label>
              <input value={form.retailer} onChange={(e) => set('retailer', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" placeholder="e.g. Sideshow, BBTS"
                style={{ border: '1px solid #E2E8F0', color: '#0F172A' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Order Reference #</label>
              <input value={form.orderReference} onChange={(e) => set('orderReference', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" placeholder="Order number"
                style={{ border: '1px solid #E2E8F0', color: '#0F172A' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Expected Release Date</label>
              <input type="date" value={form.expectedDate} onChange={(e) => set('expectedDate', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ border: '1px solid #E2E8F0', color: '#0F172A' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ border: '1px solid #E2E8F0', color: '#0F172A' }}>
                <option value="preordered">Preordered</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: '#94A3B8' }}>Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Total Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94A3B8' }}>$</span>
                <input type="number" min="0" step="0.01" value={form.totalPrice} onChange={(e) => set('totalPrice', e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg text-sm outline-none" placeholder="0.00"
                  style={{ border: '1px solid #E2E8F0', color: '#0F172A' }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Deposit Paid</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94A3B8' }}>$</span>
                <input type="number" min="0" step="0.01" value={form.depositPaid} onChange={(e) => set('depositPaid', e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg text-sm outline-none" placeholder="0.00"
                  style={{ border: '1px solid #E2E8F0', color: '#0F172A' }} />
              </div>
            </div>
          </div>
          {form.totalPrice && form.depositPaid && (
            <p className="text-sm" style={{ color: '#64748B' }}>
              Balance due: <span className="font-bold" style={{ color: '#EA580C' }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                  Math.max(0, Number(form.totalPrice) - Number(form.depositPaid))
                )}
              </span>
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
          <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Notes</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none" placeholder="Any notes about this order..."
            style={{ border: '1px solid #E2E8F0', color: '#0F172A' }} />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFF' }}>
            {saving ? 'Saving…' : 'Add Preorder'}
          </button>
          <Link href="/preorders" className="px-6 py-3 rounded-xl text-sm font-semibold text-center"
            style={{ background: '#F1F5F9', color: '#475569' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
