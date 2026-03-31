'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ImagePicker from '@/components/ImagePicker'

// Categories organized by group for the dropdown
const CATEGORY_GROUPS: { group: string; items: string[] }[] = [
  {
    group: 'Cards & Paper',
    items: [
      'Sports Cards',
      'Trading Cards (Pokémon, Magic, etc.)',
      'Comics & Graphic Novels',
      'Stamps',
      'Postcards',
      'Autographs',
      'Books & First Editions',
      'Magazines',
      'Movie & Concert Posters',
      'Political Memorabilia',
      'Historical Documents',
    ],
  },
  {
    group: 'Coins & Currency',
    items: [
      'Coins',
      'Currency & Banknotes',
      'Tokens & Medals',
      'Bullion (Gold / Silver)',
    ],
  },
  {
    group: 'Toys & Figures',
    items: [
      'Toys',
      'Action Figures',
      'Statues & Busts',
      'Funko Pops',
      'LEGO Sets',
      'Model Trains',
      'Die-Cast Cars & Vehicles',
      'Dolls & Plush',
      'Board Games & Puzzles',
    ],
  },
  {
    group: 'Video Games & Tech',
    items: [
      'Video Games & Consoles',
      'Arcade & Pinball Machines',
      'Vintage Electronics',
      'Handheld Consoles',
    ],
  },
  {
    group: 'Music',
    items: [
      'Vinyl Records',
      'Musical Instruments',
      'Amplifiers & Audio Gear',
      'Concert Memorabilia',
      'Signed Music Items',
      'CDs & Cassettes',
    ],
  },
  {
    group: 'Art & Décor',
    items: [
      'Art (Paintings & Prints)',
      'Photography',
      'Sculptures',
      'Ceramics & Pottery',
      'Glass & Crystal',
      'Clocks & Timepieces',
      'Antique Furniture',
      'Rugs & Tapestries',
    ],
  },
  {
    group: 'Watches & Accessories',
    items: [
      'Jewelry',
      'Watches & Luxury Timepieces',
      'Sneakers & Footwear',
      'Luxury Handbags',
      'Vintage Clothing',
      'Hats & Headwear',
    ],
  },
  {
    group: 'Sports & Memorabilia',
    items: [
      'Sports Memorabilia',
      'Game-Used Equipment',
      'Signed Sports Items',
      'Trophies & Awards',
      'Sports Apparel',
    ],
  },
  {
    group: 'Entertainment & Pop Culture',
    items: [
      'Movie Props & Costumes',
      'TV Memorabilia',
      'Anime & Manga',
      'Movie & TV Memorabilia',
      'Celebrity Memorabilia',
      'Space & NASA Memorabilia',
    ],
  },
  {
    group: 'Historical & Military',
    items: [
      'Military Memorabilia',
      'Weapons & Armor (Antique)',
      'War Medals & Insignia',
      'Maps & Cartography',
    ],
  },
  {
    group: 'Natural Collectibles',
    items: [
      'Fossils & Dinosaur Bones',
      'Minerals & Gemstones',
      'Meteorites',
      'Shells & Natural Specimens',
    ],
  },
  {
    group: 'Food & Drink',
    items: [
      'Wine & Spirits',
      'Beer Cans & Bottles',
      'Vintage Advertising',
    ],
  },
  {
    group: 'Other',
    items: [
      'Rocks & Minerals',
      'Science & Medical Antiques',
      'Religious Artifacts',
      'Holiday & Seasonal',
      'Other',
    ],
  },
]

// Flat list for simple use
const CATEGORIES = CATEGORY_GROUPS.flatMap((g) => g.items)

const CONDITIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor']

// Manufacturer suggestions grouped by category
const MANUFACTURER_SUGGESTIONS: Record<string, string[]> = {
  // Toys & Figures
  'Toys': ['Hasbro', 'Mattel', 'Bandai', 'LEGO', 'Funko', 'NECA', 'McFarlane Toys', 'Super7', 'Mezco Toyz'],
  'Action Figures': ['NECA', 'McFarlane Toys', 'Mezco Toyz', 'Hasbro', 'Mattel', 'Bandai', 'Tamashii Nations / S.H.Figuarts', 'Diamond Select Toys', 'Funko', 'Super7', 'Storm Collectibles'],
  'Statues & Busts': ['Sideshow Collectibles', 'Prime 1 Studio', 'PCS (Pop Culture Shock)', 'Hot Toys', 'Iron Studios', 'XM Studios', 'Queen Studios', 'Infinity Studio', 'Chronicle Collectibles', 'Weta Workshop', 'Tweeterhead', 'Gentle Giant', 'Mondo', 'Threezero', 'Beast Kingdom'],
  'Funko Pops': ['Funko'],
  'LEGO Sets': ['LEGO'],
  'Die-Cast Cars & Vehicles': ['Hot Wheels', 'Matchbox', 'Diecast Masters', 'Greenlight', 'AutoArt', 'Kyosho', 'BBurago', 'Maisto', 'Jada Toys', 'Ertl'],
  'Model Trains': ['Lionel', 'Bachmann', 'Athearn', 'Walthers', 'Atlas', 'Broadway Limited', 'Kato', 'MTH Electric Trains'],
  'Anime & Manga': ['Good Smile Company', 'Max Factory (figma)', 'Kotobukiya', 'Alter', 'MegaHouse', 'Medicom Toy (MAFEX)', 'Aniplex', 'Bandai', 'Tamashii Nations'],
  // Music
  'Musical Instruments': ['Gibson', 'Fender', 'Martin', 'Taylor', 'Guild', 'Rickenbacker', 'Gretsch', 'Epiphone', 'PRS (Paul Reed Smith)', 'Ibanez', 'Yamaha', 'Roland', 'Steinway', 'Wurlitzer', 'Rhodes'],
  'Amplifiers & Audio Gear': ['Fender', 'Marshall', 'Vox', 'Orange', 'Mesa/Boogie', 'Peavey', 'Roland', 'Line 6', 'Blackstar', 'Dr. Z'],
  'Vinyl Records': ['Blue Note', 'Columbia', 'Atlantic', 'Motown', 'Capitol', 'RCA Victor', 'Chess Records', 'Stax', 'Verve', 'Island Records'],
  // Watches
  'Watches & Luxury Timepieces': ['Rolex', 'Omega', 'Patek Philippe', 'Audemars Piguet', 'IWC', 'Cartier', 'TAG Heuer', 'Breitling', 'Jaeger-LeCoultre', 'Vacheron Constantin', 'A. Lange & Söhne', 'Hublot', 'Panerai', 'Seiko', 'Grand Seiko', 'Tudor'],
  // Sneakers
  'Sneakers & Footwear': ['Nike', 'Adidas', 'Jordan', 'New Balance', 'Yeezy', 'Converse', 'Vans', 'Reebok', 'Asics', 'Salehe Bembury', 'Travis Scott'],
  // Handbags
  'Luxury Handbags': ['Louis Vuitton', 'Hermès', 'Chanel', 'Gucci', 'Prada', 'Balenciaga', 'Dior', 'Givenchy', 'Bottega Veneta', 'Saint Laurent'],
  // Jewelry
  'Jewelry': ['Cartier', 'Tiffany & Co.', 'Van Cleef & Arpels', 'Bulgari', 'Harry Winston', 'David Yurman', 'Chopard', 'Graff'],
  // Coins
  'Coins': ['US Mint', 'Royal Canadian Mint', 'Royal Mint (UK)', 'Perth Mint', 'Austrian Mint', 'South African Mint'],
  'Bullion (Gold / Silver)': ['PAMP Suisse', 'Perth Mint', 'US Mint', 'Royal Canadian Mint', 'Credit Suisse', 'Johnson Matthey'],
  // Cards
  'Sports Cards': ['Topps', 'Panini', 'Upper Deck', 'Donruss', 'Fleer', 'Bowman', 'Leaf', 'Prizm'],
  'Trading Cards (Pokémon, Magic, etc.)': ['The Pokémon Company', 'Wizards of the Coast', 'Konami', 'Bandai', 'Upper Deck'],
  // Video Games
  'Video Games & Consoles': ['Nintendo', 'Sony', 'Microsoft', 'Sega', 'Atari', 'SNK', 'NEC', 'Magnavox'],
  // Art
  'Art (Paintings & Prints)': ['Lithograph', 'Giclée', 'Screen Print', 'Mondo', 'IKONOGRAPHICS'],
  // Sports
  'Sports Memorabilia': ['Rawlings', 'Wilson', 'Spalding', 'Riddell', 'Callaway', 'TaylorMade', 'Upper Deck', 'Steiner Sports'],
  // Comics
  'Comics & Graphic Novels': ['Marvel', 'DC Comics', 'Image Comics', 'Dark Horse', 'IDW Publishing', 'BOOM! Studios', 'Fantagraphics'],
}

function getManufacturerSuggestions(category: string): string[] {
  return MANUFACTURER_SUGGESTIONS[category] ?? []
}

const inputClass =
  'w-full rounded-lg px-3.5 py-2.5 text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
const inputStyle = {
  borderColor: '#CBD5E1',
  color: '#0F172A',
  background: '#FFFFFF',
}
const labelClass = 'block text-sm font-semibold mb-1.5'
const labelStyle = { color: '#1E293B' }

export default function NewItemPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [manufacturerOther, setManufacturerOther] = useState('')
  const [preferredGroups, setPreferredGroups] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data?.preferredGroups) {
          setPreferredGroups(JSON.parse(data.preferredGroups))
        }
      })
      .catch(() => {})
  }, [])
  const [form, setForm] = useState({
    name: '',
    category: '',
    manufacturer: '',
    description: '',
    condition: 'Good',
    paidPrice: '',
    estimatedValue: '',
    notes: '',
    imageUrl: '',
  })

  const effectiveManufacturer = form.manufacturer === 'Other' ? manufacturerOther : form.manufacturer

  function buildImageQuery() {
    const parts = [form.name, effectiveManufacturer, form.category].filter(Boolean)
    return parts.join(' ')
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        paidPrice: form.paidPrice ? parseFloat(form.paidPrice) : null,
        estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : null,
        manufacturer: effectiveManufacturer || null,
      }),
    })

    router.push('/items')
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/items"
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-3 transition-colors"
          style={{ color: '#3B82F6' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to My Items
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Add New Item</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Fill in the details about your collectible below.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          className="rounded-2xl p-6 flex flex-col gap-5"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
          }}
        >
          {/* Name */}
          <div>
            <label htmlFor="name" className={labelClass} style={labelStyle}>
              Item Name <span style={{ color: '#EF4444' }} aria-hidden="true">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Batman Premium Format Figure"
              className={inputClass}
              style={inputStyle}
              aria-required="true"
            />
          </div>

          {/* Category + Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className={labelClass} style={labelStyle}>
                Category <span style={{ color: '#EF4444' }} aria-hidden="true">*</span>
              </label>
              <select
                id="category"
                name="category"
                required
                value={form.category}
                onChange={handleChange}
                className={inputClass}
                style={inputStyle}
                aria-required="true"
              >
                <option value="">Select category</option>
                {/* Preferred categories first */}
                {preferredGroups.length > 0 && (() => {
                  const preferred = CATEGORY_GROUPS.filter((g) => preferredGroups.includes(g.group))
                  if (preferred.length === 0) return null
                  return (
                    <>
                      <optgroup label="⭐ My Collections">
                        {preferred.flatMap((g) => g.items).map((c) => (
                          <option key={`pref-${c}`} value={c}>{c}</option>
                        ))}
                      </optgroup>
                      <optgroup label="── All Categories ──" disabled />
                    </>
                  )
                })()}
                {CATEGORY_GROUPS.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.items.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="condition" className={labelClass} style={labelStyle}>
                Condition
              </label>
              <select
                id="condition"
                name="condition"
                value={form.condition}
                onChange={handleChange}
                className={inputClass}
                style={inputStyle}
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Manufacturer / Brand */}
          <div>
            <label htmlFor="manufacturer" className={labelClass} style={labelStyle}>
              Manufacturer / Brand
            </label>
            {getManufacturerSuggestions(form.category).length > 0 ? (
              <div className="flex flex-col gap-2">
                <select
                  id="manufacturer"
                  name="manufacturer"
                  value={form.manufacturer}
                  onChange={handleChange}
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="">Select manufacturer…</option>
                  {getManufacturerSuggestions(form.category).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="Other">Other (type below)</option>
                </select>
                {form.manufacturer === 'Other' && (
                  <input
                    type="text"
                    value={manufacturerOther}
                    onChange={(e) => setManufacturerOther(e.target.value)}
                    placeholder="Type manufacturer name…"
                    className={inputClass}
                    style={inputStyle}
                    autoFocus
                  />
                )}
              </div>
            ) : (
              <input
                id="manufacturer"
                name="manufacturer"
                type="text"
                value={form.manufacturer}
                onChange={handleChange}
                placeholder="e.g. Topps, Steiff, Pez…"
                className={inputClass}
                style={inputStyle}
              />
            )}
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="paidPrice" className={labelClass} style={labelStyle}>
                Paid Price ($)
              </label>
              <input
                id="paidPrice"
                name="paidPrice"
                type="number"
                step="0.01"
                min="0"
                value={form.paidPrice}
                onChange={handleChange}
                placeholder="0.00"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="estimatedValue" className={labelClass} style={labelStyle}>
                Est. Value ($)
              </label>
              <input
                id="estimatedValue"
                name="estimatedValue"
                type="number"
                step="0.01"
                min="0"
                value={form.estimatedValue}
                onChange={handleChange}
                placeholder="0.00"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

        {/* Image */}
        <div>
          <label className={labelClass} style={labelStyle}>Item Image</label>
          <div className="flex gap-3 items-start">
            <div
              className="w-24 h-24 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover object-top rounded-xl" />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowImagePicker(true)}
                disabled={!form.name}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFFFFF' }}
                title={!form.name ? 'Enter an item name first' : 'Search for an image'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                {form.imageUrl ? 'Change Image' : 'Find Image'}
              </button>
              {form.imageUrl && (
                <button type="button" onClick={() => setForm({ ...form, imageUrl: '' })}
                  className="text-xs font-medium text-center" style={{ color: '#EF4444' }}>
                  Remove image
                </button>
              )}
              {!form.name && (
                <p className="text-xs" style={{ color: '#94A3B8' }}>Enter a name above to enable image search</p>
              )}
            </div>
          </div>
        </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={labelClass} style={labelStyle}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Optional details about the item..."
              className={inputClass}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className={labelClass} style={labelStyle}>
              Personal Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Where you got it, sentimental value, storage location..."
              className={inputClass}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Actions */}
          <div
            className="flex items-center gap-3 pt-2 border-t"
            style={{ borderColor: '#F1F5F9' }}
          >
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
              style={{
                background: saving ? '#93C5FD' : 'linear-gradient(135deg, #3B82F6, #6366F1)',
                color: '#FFFFFF',
              }}
            >
              {saving ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" />
                    <path d="M21 12a9 9 0 00-9-9" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Item'
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={{
                border: '1px solid #CBD5E1',
                color: '#475569',
                background: '#FFFFFF',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      {/* Image Picker Modal */}
      {showImagePicker && (
        <ImagePicker
          query={buildImageQuery()}
          onConfirm={(url) => {
            setForm({ ...form, imageUrl: url })
            setShowImagePicker(false)
          }}
          onClose={() => setShowImagePicker(false)}
        />
      )}
    </div>
  )
}
