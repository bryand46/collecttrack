'use client'

import { useState } from 'react'

const COLLECTION_GROUPS = [
  { id: 'Toys & Figures',         emoji: '🧸', label: 'Toys & Figures',         desc: 'Action figures, statues, Funko Pops, LEGO' },
  { id: 'Cards & Paper',          emoji: '🃏', label: 'Cards & Paper',           desc: 'Sports cards, Pokémon, comics, stamps' },
  { id: 'Coins & Currency',       emoji: '🪙', label: 'Coins & Currency',        desc: 'Coins, banknotes, bullion, medals' },
  { id: 'Music',                  emoji: '🎸', label: 'Music',                   desc: 'Vinyl records, instruments, concert memorabilia' },
  { id: 'Watches & Accessories',  emoji: '⌚', label: 'Watches & Accessories',   desc: 'Luxury watches, jewelry, handbags, sneakers' },
  { id: 'Art & Décor',            emoji: '🎨', label: 'Art & Décor',             desc: 'Paintings, sculptures, ceramics, antiques' },
  { id: 'Sports & Memorabilia',   emoji: '🏆', label: 'Sports & Memorabilia',    desc: 'Signed items, game-used gear, trophies' },
  { id: 'Entertainment & Pop Culture', emoji: '🎬', label: 'Entertainment & Pop Culture', desc: 'Movie props, TV items, celebrity memorabilia' },
  { id: 'Video Games & Tech',     emoji: '🎮', label: 'Video Games & Tech',      desc: 'Consoles, games, vintage electronics' },
  { id: 'Historical & Military',  emoji: '🎖️', label: 'Historical & Military',   desc: 'War medals, weapons, maps, artifacts' },
  { id: 'Natural Collectibles',   emoji: '🦕', label: 'Natural Collectibles',    desc: 'Fossils, minerals, meteorites, specimens' },
  { id: 'Food & Drink',           emoji: '🍷', label: 'Food & Drink',            desc: 'Wine, spirits, vintage advertising' },
]

type Props = {
  onComplete: () => void
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState<'name' | 'categories'>('name')
  const [displayName, setDisplayName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredGroups: selected, displayName: displayName.trim() || null }),
    })
    setSaving(false)
    onComplete()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: '#FFFFFF',
          boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="px-8 py-7"
          style={{ background: 'linear-gradient(135deg, #1E40AF, #6366F1)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}
            >
              CT
            </div>
            <span className="text-white font-semibold text-lg">CollectTrack</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {step === 'name' ? "Welcome! Let's get started." : "What do you collect?"}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {step === 'name'
              ? "Tell us your name so we can personalize your experience."
              : "Select everything that applies — we'll put your categories front and center."}
          </p>
          {/* Step indicator */}
          <div className="flex gap-2 mt-4">
            {['name', 'categories'].map((s, i) => (
              <div
                key={s}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: step === s ? '32px' : '12px',
                  background: step === s ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 'name' ? (
            <div className="px-8 py-8">
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1E293B' }}>
                Your Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && displayName.trim()) setStep('categories') }}
                placeholder="e.g. Bryan"
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-base border-2 focus:outline-none focus:border-blue-500 transition-colors"
                style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
              />
              <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>This is optional — you can skip it.</p>
            </div>
          ) : (
            <div className="px-8 py-6">
              <div className="grid grid-cols-2 gap-3">
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
          )}
        </div>

        {/* Footer */}
        <div
          className="px-8 py-5 flex items-center justify-between border-t"
          style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}
        >
          {step === 'categories' ? (
            <button
              onClick={() => setStep('name')}
              className="text-sm font-medium"
              style={{ color: '#64748B' }}
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {step === 'name' ? (
              <button
                onClick={() => setStep('categories')}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
              >
                Next →
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-sm font-medium"
                  style={{ color: '#94A3B8' }}
                >
                  Skip
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || selected.length === 0}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
                >
                  {saving ? 'Saving…' : `Let's go${selected.length > 0 ? ` (${selected.length} selected)` : ''}`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
