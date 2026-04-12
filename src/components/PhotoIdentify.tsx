'use client'

import { useRef, useState } from 'react'

type IdentifiedItem = {
  name:                string | null
  manufacturer:        string | null
  category:            string | null
  edition:             string | null
  description:         string | null
  confidence:          'high' | 'medium' | 'low'
  identificationNotes: string | null
}

type ValueResult = {
  average: number
  low:     number
  high:    number
  confidence: 'high' | 'medium' | 'low'
  sources:    string[]
}

type Props = {
  onConfirm: (fields: Partial<{
    name:           string
    manufacturer:   string
    category:       string
    edition:        string
    description:    string
    estimatedValue: string
  }>) => void
  onClose: () => void
}

type Stage = 'idle' | 'analyzing' | 'confirmed' | 'error'

const MAX_DIMENSION = 1024
const JPEG_QUALITY  = 0.85

async function prepareImage(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img  = new Image()
    const url  = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      const scale  = Math.min(1, MAX_DIMENSION / Math.max(width, height))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(width  * scale)
      canvas.height = Math.round(height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const base64  = canvas.toDataURL(outType, JPEG_QUALITY).split(',')[1]
      resolve({ base64, mediaType: outType })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')) }
    img.src = url
  })
}

async function fetchMarketValue(
  name: string,
  manufacturer: string | null,
  edition: string | null
): Promise<ValueResult | null> {
  try {
    const params = new URLSearchParams({ name })
    if (manufacturer) params.set('manufacturer', manufacturer)
    if (edition)      params.set('edition', edition)
    const res  = await fetch(`/api/market-value-ai?${params.toString()}`)
    const data = await res.json()
    if (!res.ok || data.error) return null
    return data as ValueResult
  } catch {
    return null
  }
}

const confidenceConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  high:   { label: 'High confidence',   bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },
  medium: { label: 'Medium confidence', bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' },
  low:    { label: 'Low confidence',    bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
}

export default function PhotoIdentify({ onConfirm, onClose }: Props) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const [stage,        setStage]        = useState<Stage>('idle')
  const [preview,      setPreview]      = useState<string | null>(null)
  const [result,       setResult]       = useState<IdentifiedItem | null>(null)
  const [editFields,   setEditFields]   = useState<Partial<IdentifiedItem>>({})
  const [errorMsg,     setErrorMsg]     = useState('')

  // Market value state — fetched in parallel with identification
  const [valueResult,  setValueResult]  = useState<ValueResult | null>(null)
  const [valueLoading, setValueLoading] = useState(false)
  const [valueError,   setValueError]   = useState(false)
  // Whether the user has chosen to include the found value
  const [useValue,     setUseValue]     = useState(true)

  function getField<K extends keyof IdentifiedItem>(key: K): string {
    if (key in editFields) return (editFields[key] as string) ?? ''
    return (result?.[key] as string) ?? ''
  }
  function setField(key: keyof IdentifiedItem, value: string) {
    setEditFields((f) => ({ ...f, [key]: value }))
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file.')
      setStage('error')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setStage('analyzing')
    setResult(null)
    setEditFields({})
    setErrorMsg('')
    setValueResult(null)
    setValueError(false)
    setUseValue(true)

    try {
      const { base64, mediaType } = await prepareImage(file)

      const res  = await fetch('/api/identify-item', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageData: base64, mediaType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Identification failed')

      const identified = data as IdentifiedItem
      setResult(identified)
      setStage('confirmed')

      // Kick off value lookup in the background immediately
      if (identified.name) {
        setValueLoading(true)
        fetchMarketValue(identified.name, identified.manufacturer, identified.edition)
          .then((v) => {
            setValueResult(v)
            setValueError(!v)
          })
          .finally(() => setValueLoading(false))
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
      setStage('error')
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function handleUseDetails() {
    const fields: Parameters<typeof onConfirm>[0] = {
      name:         getField('name')         || undefined,
      manufacturer: getField('manufacturer') || undefined,
      category:     getField('category')     || undefined,
      edition:      getField('edition')      || undefined,
      description:  getField('description')  || undefined,
    }
    if (useValue && valueResult) {
      fields.estimatedValue = String(valueResult.average)
    }
    onConfirm(fields)
  }

  function handleRetry() {
    setStage('idle')
    setPreview(null)
    setResult(null)
    setEditFields({})
    setErrorMsg('')
    setValueResult(null)
    setValueError(false)
  }

  const conf = result ? (confidenceConfig[result.confidence] ?? confidenceConfig.medium) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Identify item from photo"
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#FFFFFF', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', maxHeight: '90vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: '#E2E8F0' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: '#0F172A' }}>Add by Photo</h2>
              <p className="text-xs" style={{ color: '#64748B' }}>
                {stage === 'idle'      && 'Upload or snap a photo to identify your item'}
                {stage === 'analyzing' && 'Analyzing your photo…'}
                {stage === 'confirmed' && 'Review the identified details'}
                {stage === 'error'     && 'Something went wrong'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: '#64748B', background: '#F1F5F9' }} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* IDLE */}
          {stage === 'idle' && (
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-center" style={{ color: '#64748B' }}>
                Take or upload a photo of your collectible and we'll automatically fill in the details and estimated value for you.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Upload Photo', sub: 'From your computer', ref: uploadRef,
                    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> },
                  { label: 'Take Photo',   sub: 'Use your camera',    ref: cameraRef,
                    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> },
                ].map(({ label, sub, ref, icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => ref.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl transition-all border-2 border-dashed"
                    style={{ borderColor: '#CBD5E1', background: '#F8FAFC', color: '#475569' }}
                    onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor='#6366F1'; el.style.background='#EEF2FF'; el.style.color='#4338CA' }}
                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor='#CBD5E1'; el.style.background='#F8FAFC'; el.style.color='#475569' }}
                  >
                    {icon}
                    <div className="text-center">
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs mt-0.5 opacity-70">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-center" style={{ color: '#94A3B8' }}>
                Works best with clear, well-lit photos showing the item's front, base label, or packaging.
              </p>
            </div>
          )}

          {/* ANALYZING */}
          {stage === 'analyzing' && (
            <div className="p-6 flex flex-col items-center gap-5">
              {preview && (
                <div className="w-40 h-40 rounded-2xl overflow-hidden shrink-0" style={{ border: '2px solid #E2E8F0' }}>
                  <img src={preview} alt="Your photo" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: '#6366F1', borderTopColor: 'transparent' }} aria-label="Analyzing..." />
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>Identifying your collectible…</p>
                  <p className="text-xs mt-1" style={{ color: '#64748B' }}>This usually takes a few seconds</p>
                </div>
              </div>
            </div>
          )}

          {/* ERROR */}
          {stage === 'error' && (
            <div className="p-6 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#FEE2E2' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Identification failed</p>
                <p className="text-xs mt-1" style={{ color: '#64748B' }}>{errorMsg}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleRetry} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#FFFFFF' }}>Try another photo</button>
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: '1px solid #CBD5E1', color: '#475569', background: '#FFFFFF' }}>Add manually</button>
              </div>
            </div>
          )}

          {/* CONFIRMED */}
          {stage === 'confirmed' && result && conf && (
            <div className="p-5 flex flex-col gap-4">

              {/* Photo + confidence */}
              <div className="flex gap-4 items-start">
                {preview && (
                  <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0" style={{ border: '2px solid #E2E8F0' }}>
                    <img src={preview} alt="Your photo" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 flex flex-col gap-2">
                  <span className="self-start text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: conf.bg, color: conf.text, border: `1px solid ${conf.border}` }}>
                    {conf.label}
                  </span>
                  {result.identificationNotes && (
                    <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>{result.identificationNotes}</p>
                  )}
                </div>
              </div>

              {/* ── Market value card ── */}
              <div
                className="rounded-xl p-3.5"
                style={
                  valueLoading
                    ? { background: '#F8FAFC', border: '1px solid #E2E8F0' }
                    : valueResult
                    ? { background: '#F0FDF4', border: '1px solid #BBF7D0' }
                    : { background: '#FFF7ED', border: '1px solid #FED7AA' }
                }
              >
                {valueLoading && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin shrink-0" style={{ borderColor: '#6366F1', borderTopColor: 'transparent' }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#475569' }}>Looking up market value…</p>
                      <p className="text-xs" style={{ color: '#94A3B8' }}>Searching recent sold listings</p>
                    </div>
                  </div>
                )}

                {!valueLoading && valueResult && (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold mb-0.5" style={{ color: '#166534' }}>Market value found</p>
                      <p className="text-sm font-bold" style={{ color: '#0F172A' }}>
                        ${valueResult.average.toLocaleString()}
                        <span className="text-xs font-normal ml-1.5" style={{ color: '#64748B' }}>
                          avg · ${valueResult.low.toLocaleString()}–${valueResult.high.toLocaleString()}
                        </span>
                      </p>
                      {valueResult.sources.length > 0 && (
                        <p className="text-xs mt-0.5" style={{ color: '#86EFAC' }}>via {valueResult.sources.join(', ')}</p>
                      )}
                    </div>
                    {/* Toggle: include value or not */}
                    <button
                      type="button"
                      onClick={() => setUseValue((v) => !v)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={useValue
                        ? { background: '#166534', color: '#FFFFFF' }
                        : { background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }
                      }
                    >
                      {useValue ? (
                        <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Including</>
                      ) : 'Include value'}
                    </button>
                  </div>
                )}

                {!valueLoading && valueError && (
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p className="text-xs" style={{ color: '#9A3412' }}>
                      Couldn't find a market value — you can search manually after adding the item.
                    </p>
                  </div>
                )}
              </div>

              <p className="text-xs font-semibold" style={{ color: '#94A3B8' }}>REVIEW &amp; EDIT BEFORE ADDING</p>

              {/* Editable fields */}
              {(
                [
                  { key: 'name',         label: 'Item Name',         placeholder: 'e.g. Batman Premium Format Figure' },
                  { key: 'manufacturer', label: 'Manufacturer',      placeholder: 'e.g. Sideshow Collectibles' },
                  { key: 'category',     label: 'Category',          placeholder: 'e.g. Statues & Busts' },
                  { key: 'edition',      label: 'Edition / Variant',  placeholder: 'e.g. Exclusive' },
                ] as { key: keyof IdentifiedItem; label: string; placeholder: string }[]
              ).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#1E293B' }}>{label}</label>
                  <input
                    type="text"
                    value={getField(key)}
                    onChange={(e) => setField(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg px-3 py-2 text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    style={{ borderColor: '#CBD5E1', color: '#0F172A', background: '#FFFFFF' }}
                  />
                </div>
              ))}

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#1E293B' }}>Description</label>
                <textarea
                  value={getField('description')}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={3}
                  placeholder="Optional details..."
                  className="w-full rounded-lg px-3 py-2 text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  style={{ borderColor: '#CBD5E1', color: '#0F172A', background: '#FFFFFF', resize: 'vertical' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {stage === 'confirmed' && (
          <div className="flex items-center justify-between px-5 py-4 border-t shrink-0" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
            <button type="button" onClick={handleRetry} className="text-sm font-medium flex items-center gap-1.5" style={{ color: '#6366F1' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
              </svg>
              Try another photo
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: '1px solid #CBD5E1', color: '#475569', background: '#FFFFFF' }}>
                Add manually
              </button>
              <button
                type="button"
                onClick={handleUseDetails}
                className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"
                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#FFFFFF' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Use These Details
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input ref={uploadRef} type="file" accept="image/*" onChange={handleFileInput} className="sr-only" aria-hidden="true" tabIndex={-1} />
      {/* capture="environment" opens rear camera on mobile */}
      <input ref={cameraRef} type="file" accept="image/*"
        // @ts-ignore
        capture="environment"
        onChange={handleFileInput} className="sr-only" aria-hidden="true" tabIndex={-1} />
    </div>
  )
}
