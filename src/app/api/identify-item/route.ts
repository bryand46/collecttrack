import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// All valid categories the app understands — passed to Claude so it picks one
const VALID_CATEGORIES = [
  'Sports Cards', 'Trading Cards (Pokémon, Magic, etc.)', 'Comics & Graphic Novels',
  'Stamps', 'Postcards', 'Autographs', 'Books & First Editions', 'Magazines',
  'Movie & Concert Posters', 'Political Memorabilia', 'Historical Documents',
  'Coins', 'Currency & Banknotes', 'Tokens & Medals', 'Bullion (Gold / Silver)',
  'Toys', 'Action Figures', 'Statues & Busts', 'Funko Pops', 'LEGO Sets',
  'Model Trains', 'Die-Cast Cars & Vehicles', 'Dolls & Plush', 'Board Games & Puzzles',
  'Video Games & Consoles', 'Arcade & Pinball Machines', 'Vintage Electronics', 'Handheld Consoles',
  'Vinyl Records', 'Musical Instruments', 'Amplifiers & Audio Gear', 'Concert Memorabilia',
  'Signed Music Items', 'CDs & Cassettes',
  'Art (Paintings & Prints)', 'Photography', 'Sculptures', 'Ceramics & Pottery',
  'Glass & Crystal', 'Clocks & Timepieces', 'Antique Furniture', 'Rugs & Tapestries',
  'Jewelry', 'Watches & Luxury Timepieces', 'Sneakers & Footwear', 'Luxury Handbags',
  'Vintage Clothing', 'Hats & Headwear',
  'Sports Memorabilia', 'Game-Used Equipment', 'Signed Sports Items', 'Trophies & Awards', 'Sports Apparel',
  'Movie Props & Costumes', 'TV Memorabilia', 'Anime & Manga', 'Movie & TV Memorabilia',
  'Celebrity Memorabilia', 'Space & NASA Memorabilia',
  'Military Memorabilia', 'Weapons & Armor (Antique)', 'War Medals & Insignia', 'Maps & Cartography',
  'Fossils & Dinosaur Bones', 'Minerals & Gemstones', 'Meteorites', 'Shells & Natural Specimens',
  'Wine & Spirits', 'Beer Cans & Bottles', 'Vintage Advertising',
  'Rocks & Minerals', 'Science & Medical Antiques', 'Religious Artifacts',
  'Holiday & Seasonal', 'Other',
]

const IDENTIFY_PROMPT = `You are an expert collectibles appraiser with deep knowledge across statues, action figures, trading cards, coins, sports memorabilia, vinyl records, sneakers, watches, art, and all other collectibles categories.

Examine this image carefully and identify the collectible item shown. Return ONLY a valid JSON object — no markdown, no explanation, no code fences — with exactly these fields:

{
  "name": "The specific product name as precise as possible (e.g. 'Poison Ivy Deadly Nature Premium Format Figure', 'LeBron James 2003-04 Topps Chrome Rookie #111')",
  "manufacturer": "Brand or manufacturer name (e.g. 'Sideshow Collectibles', 'Topps', 'Nike'). Use null if truly unknown.",
  "category": "Pick the single best match from this list: ${VALID_CATEGORIES.join(', ')}",
  "edition": "Specific variant or edition if visible (e.g. 'Exclusive', 'First Edition', 'Chase'). Use null if standard/unknown.",
  "description": "2-3 sentences describing what you see — material, scale, character, subject matter, notable features.",
  "confidence": "high if you can clearly identify the item, medium if you have a good guess, low if uncertain",
  "identificationNotes": "Brief note on how you identified it, or what made it hard to identify. 1 sentence."
}

Be as specific as possible. If the item has visible branding, a base/plaque, packaging text, or a serial number — use it. If uncertain, still give your best guess and reflect that in the confidence field.`

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Image identification is not configured. Ask your admin to add ANTHROPIC_API_KEY.' },
      { status: 503 }
    )
  }

  let imageData: string
  let mediaType: string

  try {
    const body = await request.json()
    imageData = body.imageData   // base64-encoded image data (no data URI prefix)
    mediaType = body.mediaType   // e.g. 'image/jpeg'

    if (!imageData || !mediaType) throw new Error('Missing imageData or mediaType')

    // Basic validation — ensure it looks like base64
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(imageData.slice(0, 100))) {
      throw new Error('imageData does not appear to be valid base64')
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Bad request: ${err.message}` }, { status: 400 })
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageData,
                },
              },
              {
                type: 'text',
                text: IDENTIFY_PROMPT,
              },
            ],
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      console.error('[identify-item] Anthropic error:', anthropicRes.status, errBody)
      return NextResponse.json(
        { error: `Identification service error (${anthropicRes.status}). Try again or add the item manually.` },
        { status: 502 }
      )
    }

    const anthropicData = await anthropicRes.json()
    const rawText: string = anthropicData?.content?.[0]?.text ?? ''

    // Strip markdown fences if Claude added them despite instructions
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    let identified: Record<string, unknown>
    try {
      identified = JSON.parse(jsonText)
    } catch {
      console.error('[identify-item] Failed to parse Claude response:', rawText)
      return NextResponse.json(
        { error: 'Could not parse identification result. Try a clearer photo.' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      name:                identified.name                ?? null,
      manufacturer:        identified.manufacturer        ?? null,
      category:            identified.category            ?? null,
      edition:             identified.edition             ?? null,
      description:         identified.description         ?? null,
      confidence:          identified.confidence          ?? 'low',
      identificationNotes: identified.identificationNotes ?? null,
    })
  } catch (err: any) {
    console.error('[identify-item] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Identification failed. Please try again.' },
      { status: 500 }
    )
  }
}
