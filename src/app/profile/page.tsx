'use client'

import { useEffect, useState } from 'react'

const COLLECTION_GROUPS = [
  { id: 'Toys & Figures',              emoji: '🧸', label: 'Toys & Figures',              desc: 'Action figures, statues, Funko Pops, LEGO' },
  { id: 'Cards & Paper',               emoji: '🃏', label: 'Cards & Paper',                desc: 'Sports cards, Pokémon, comics, stamps' },
  { id: 'Coins & Currency',            emoji: '🪙', label: 'Coins & Currency',             desc: 'Coins, banknotes, bullion, medals' },
  { id: 'Music',                       emoji: '🎸', label: 'Music',                        desc: 'Vinyl records, instruments, concert memorabilia' },
  { id: 'Watches & Accessories',       emoji: '⌚', label: 'Watches & Accessories',        desc: 'Luxury watches, jewelry, handbags, sneakers' },
  { id: 'Art & Décor',                 emoji: '🎨', label: 'Art & Décor',                  desc: 'Paintings, sculptures, ceramics, antiques' },
  { id: 'Sports & Memorabilia',        emoji: '🏆', label: 'Sports & Memorabilia',         desc: 'Signed items, game-used gear, trophies' },
  { id: 'Entertainment & Pop Culture', emoji: '🎬', label: 'Entertainment & Pop Culture',  desc: 'Movie props, TV items, celebrity memorabilia' },
  { id: 'Video Games & Tech',          emoji: '🎮', label: 'Video Games & Tech',           desc: 'Consoles, games, vintage electronics' },
  { id: 'Historical & Military',       emoji: '🎖️', label: 'Historical & Military',        desc: 'War medals, weapons, maps, artifacts' },
  { id: 'Natural Collectibles',        emoji: '🦕', label: 'Natural Collectibles',         desc: 'Fossils, minerals, meteorites, specimens' },
  { id: 'Food & Drink',                emoji: '🍷', label: 'Food & Drink',                 desc: 'Wine, spirits, vintage advertising' },
]

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setDisplayName(data.displayName ?? '')
          setSelected(JSON.parse(data.preferredGroups ?? '[]'))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredGroups: selected, displayName: displayName.trim() || null }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm" style={{ color: '#64748B' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>My Profile</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Your preferred categories appear first when adding items.
        </p>
      </div>

      <div
        className="rounded-2xl p-6 flex flex-col gap-6"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        {/* Display Name */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1E293B' }}>
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setSaved(false) }}
            placeholder="e.g. Bryan"
            className="w-full rounded-lg px-3.5 py-2.5 text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: '#CBD5E1', color: '#0F172A', background: '#FFFFFF' }}
          />
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #E2E8F0' }} />

        {/* Collection Preferences */}
        <div>
          <div className="mb-4">
            <h2 className="text-base font-bold" style={{ color: '#0F172A' }}>What do you collect?</h2>
            <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
              Selected categories appear under <strong>⭐ My Collections</strong> when adding items.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COLLECTION_GROUPS.map((group) => {
              const isSelected = selected.includes(group.id)
              return (
                <button
                  key={group.id}
                  onClick={() => toggle(group.id)}
                  className="flex items-start gap-3 rounded-xl p-4 text-left transition-all"
                  style={{
                    border: isSelected ? '2px solid #3B82F6' : '2px solid #E2E8F0',
                    background: isSelected ? '#EFF6FF' : '#FAFAFA',
                    boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
                  }}
                >
                  <span className="text-2xl mt-0.5 leading-none">{group.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold" style={{ color: isSelected ? '#1D4ED8' : '#0F172A' }}>
                        {group.label}
                      </span>
                      {isSelected && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: '#3B82F6' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-xs mt-0.5 block" style={{ color: '#64748B' }}>{group.desc}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            {selected.length === 0 ? 'No categories selected' : `${selected.length} categor${selected.length === 1 ? 'y' : 'ies'} selected`}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all flex items-center gap-2"
            style={{ background: saved ? '#16A34A' : 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
