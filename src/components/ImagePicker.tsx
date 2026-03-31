'use client'

import { useState, useEffect, useCallback } from 'react'

type ImageResult = {
  url: string
  thumbnail: string
  sourceUrl: string
  title: string
}

type Props = {
  query: string
  onConfirm: (url: string) => void
  onClose: () => void
}

export default function ImagePicker({ query, onConfirm, onClose }: Props) {
  const [images, setImages] = useState<ImageResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ImageResult | null>(null)
  const [customUrl, setCustomUrl] = useState('')
  const [downloading, setDownloading] = useState(false)

  const search = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    setSelected(null)

    try {
      const res = await fetch(`/api/image-search?q=${encodeURIComponent(q)}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Search failed')

      setImages(data.images ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    search(query)
  }, [query, search])

  async function handleConfirm() {
    // Use thumbnail URL for search results (Brave CDN, always accessible)
    // Use custom URL as-is if typed manually
    const downloadUrl = selected ? selected.thumbnail : customUrl.trim()
    if (!downloadUrl) return

    setDownloading(true)
    try {
      const res = await fetch('/api/download-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: downloadUrl }),
      })
      const data = await res.json()

      if (!res.ok || !data.localUrl) {
        onConfirm(downloadUrl)
      } else {
        onConfirm(data.localUrl)
      }
    } catch {
      onConfirm(downloadUrl)
      onConfirm(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Find image for item"
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: '#FFFFFF',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: '#E2E8F0' }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: '#0F172A' }}>Find Image</h2>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
              Searching for: <span className="font-medium" style={{ color: '#3B82F6' }}>{query}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#64748B', background: '#F1F5F9' }}
            aria-label="Close image picker"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#3B82F6', borderTopColor: 'transparent' }}
                aria-label="Searching..."
              />
              <p className="text-sm" style={{ color: '#64748B' }}>Searching for images...</p>
            </div>
          )}

          {error && (
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}
            >
              <p className="text-sm font-medium" style={{ color: '#BE123C' }}>{error}</p>
              <button
                onClick={() => search(query)}
                className="mt-2 text-sm font-medium"
                style={{ color: '#3B82F6' }}
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && images.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: '#64748B' }}>No images found. Try a different search term.</p>
            </div>
          )}

          {!loading && !error && images.length > 0 && (
            <>
              <p className="text-xs font-medium mb-3" style={{ color: '#94A3B8' }}>
                Click an image to select it, then confirm below
              </p>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(img)}
                    className="relative rounded-xl overflow-hidden transition-all"
                    style={{
                      aspectRatio: '1',
                      border: selected?.thumbnail === img.thumbnail
                        ? '3px solid #3B82F6'
                        : '2px solid transparent',
                      outline: selected?.thumbnail === img.thumbnail ? '2px solid #BFDBFE' : 'none',
                      outlineOffset: '1px',
                    }}
                    aria-label={`Select image: ${img.title}`}
                    aria-pressed={selected?.thumbnail === img.thumbnail}
                  >
                    <img
                      src={img.thumbnail}
                      alt={img.title}
                      className="w-full h-full object-cover object-top"
                    />
                    {selected?.thumbnail === img.thumbnail && (
                      <div
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: '#3B82F6' }}
                        aria-hidden="true"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Custom URL input */}
        <div
          className="px-4 pt-3 pb-2 border-t"
          style={{ borderColor: '#F1F5F9' }}
        >
          <label
            htmlFor="custom-url"
            className="block text-xs font-semibold mb-1.5"
            style={{ color: '#64748B' }}
          >
            Or paste an image URL directly:
          </label>
          <input
            id="custom-url"
            type="url"
            value={customUrl}
            onChange={(e) => {
              setCustomUrl(e.target.value)
              setSelected(null)
            }}
            placeholder="https://example.com/image.jpg"
            className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: '#CBD5E1', color: '#0F172A' }}
          />
        </div>

        {/* Footer actions */}
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}
        >
          <button
            onClick={() => search(query)}
            disabled={downloading}
            className="text-sm font-medium flex items-center gap-1.5 transition-colors"
            style={{ color: '#3B82F6' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh results
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={downloading}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ border: '1px solid #CBD5E1', color: '#475569', background: '#FFFFFF' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={(!selected && !customUrl.trim()) || downloading}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-all flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                color: '#FFFFFF',
              }}
            >
              {downloading ? (
                <>
                  <div
                    className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: 'white', borderTopColor: 'transparent' }}
                  />
                  Saving...
                </>
              ) : (
                'Use This Image'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
