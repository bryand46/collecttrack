import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withinLookupLimit, needsLookupReset, type Plan } from '@/lib/plans'

// ── Helpers ──────────────────────────────────────────────────────────────────

function removeOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices
  const s   = [...prices].sort((a, b) => a - b)
  const q1  = s[Math.floor(s.length * 0.25)]
  const q3  = s[Math.floor(s.length * 0.75)]
  const iqr = q3 - q1
  if (iqr === 0) return prices
  const lower = q1 - 1.5 * iqr
  const upper = q3 + 1.5 * iqr
  return s.filter((p) => p >= lower && p <= upper)
}

/**
 * Rough title relevance check — does the listing title contain enough of
 * the key words from the item name / manufacturer to be the same thing?
 * Returns a score 0-1. We filter out low-scoring titles.
 */
function relevanceScore(title: string, name: string, manufacturer: string): number {
  const t    = title.toLowerCase()
  const words = [...name.toLowerCase().split(/\s+/), ...manufacturer.toLowerCase().split(/\s+/)]
    .filter((w) => w.length > 2)  // skip short words like "of", "the"
  if (words.length === 0) return 1
  const hits = words.filter((w) => t.includes(w)).length
  return hits / words.length
}

// ── eBay scraper ─────────────────────────────────────────────────────────────

type EbayListing = { title: string; price: number; url: string; soldDate: string }

async function fetchEbaySoldListings(query: string): Promise<EbayListing[]> {
  const searchUrl =
    `https://www.ebay.com/sch/i.html?` +
    `_nkw=${encodeURIComponent(query)}` +
    `&LH_Sold=1&LH_Complete=1&_sacat=0&_from=R40&rt=nc`

  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control':   'no-cache',
    },
    // No Next.js cache — we always want fresh sold data
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`eBay responded with ${res.status}`)
  const html = await res.text()

  const listings: EbayListing[] = []

  // ── Extract item blocks ────────────────────────────────────────────────────
  // Each sold listing sits inside a <li class="s-item ..."> block.
  // We split on these to keep prices + titles paired correctly.
  const itemBlocks = html.split(/<li[^>]+class="[^"]*s-item[^"]*"/)

  for (const block of itemBlocks.slice(1)) {  // skip first (empty before first li)
    // Title — eBay puts it in spans with role="heading" or class="s-item__title"
    const titleMatch =
      block.match(/class="s-item__title[^"]*"[^>]*>\s*(?:<span[^>]*>)?\s*([^<]{5,})/i) ||
      block.match(/role="heading"[^>]*>\s*([^<]{5,})/i)
    const title = titleMatch?.[1]?.trim().replace(/&amp;/g, '&').replace(/&#39;/g, "'") ?? ''

    // Skip eBay's injected "Shop on eBay" placeholder blocks
    if (!title || title.toLowerCase().includes('shop on ebay') || title.toLowerCase().includes('results for')) continue

    // Price — "$850.00" or "$1,000.00"
    const priceMatch = block.match(/class="s-item__price[^"]*"[^>]*>\s*\$\s*([\d,]+(?:\.\d{1,2})?)/i)
    if (!priceMatch) continue
    const price = parseFloat(priceMatch[1].replace(/,/g, ''))
    if (!price || price < 5 || price > 500_000) continue

    // URL
    const urlMatch = block.match(/href="(https:\/\/www\.ebay\.com\/itm\/[^"?]+)/)
    const url = urlMatch?.[1] ?? `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1`

    // Sold date (optional — for display)
    const dateMatch = block.match(/Sold\s+([\w]+ \d{1,2},\s*\d{4})/i)
    const soldDate  = dateMatch?.[1] ?? ''

    listings.push({ title, price, url, soldDate })
  }

  return listings
}

// ── Brave fallback ────────────────────────────────────────────────────────────

type SearchResult = { title: string; url: string; description: string }

async function fetchBraveResults(query: string, apiKey: string): Promise<SearchResult[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', '10')
  url.searchParams.set('safesearch', 'moderate')
  url.searchParams.set('freshness', 'py')
  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': apiKey },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data?.web?.results ?? []
}

function extractPricesFromText(text: string): number[] {
  const matches = text.match(/\$\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/g) ?? []
  return matches.map((m) => parseFloat(m.replace(/[$,\s]/g, ''))).filter((n) => n >= 10 && n <= 500_000)
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp           = new URL(request.url).searchParams
  const name         = (sp.get('name') || sp.get('q') || '').trim()
  const manufacturer = (sp.get('manufacturer') || '').trim()
  const condition    = (sp.get('condition') || '').trim()
  const edition      = (sp.get('edition') || '').trim()
  const itemId       = (sp.get('itemId') || '').trim()

  if (!name) return NextResponse.json({ error: 'Missing item name' }, { status: 400 })

  // ── Quota ──────────────────────────────────────────────────────────────────
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let { marketLookupCount, marketLookupResetAt } = user
  if (needsLookupReset(marketLookupResetAt)) {
    marketLookupCount = 0
    await prisma.user.update({ where: { id: user.id }, data: { marketLookupCount: 0, marketLookupResetAt: new Date() } })
  }
  if (!withinLookupLimit(user.plan as Plan, marketLookupCount)) {
    return NextResponse.json({ error: 'Monthly lookup limit reached', plan: user.plan, upgradePath: '/pricing' }, { status: 403 })
  }

  // ── Build search query ─────────────────────────────────────────────────────
  // Include manufacturer in query — critical for specificity (Sideshow vs generic)
  const editionPart = edition && edition !== '__other__' ? edition : ''
  const searchQuery = [name, manufacturer, editionPart].filter(Boolean).join(' ')

  // ── Primary: eBay sold listings ────────────────────────────────────────────
  let listings: EbayListing[] = []
  let source: 'ebay' | 'brave' = 'ebay'

  try {
    const raw = await fetchEbaySoldListings(searchQuery)

    // Filter to listings whose titles are actually relevant to this item
    // (removes noise when eBay shows loosely related results)
    const RELEVANCE_THRESHOLD = 0.4
    listings = raw.filter(
      (l) => relevanceScore(l.title, name, manufacturer) >= RELEVANCE_THRESHOLD
    )
  } catch (err) {
    console.error('eBay fetch error:', err)
    // Fall through to Brave
  }

  // ── Fallback: Brave Search ─────────────────────────────────────────────────
  let usedBraveFallback = false
  if (listings.length < 2) {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY
    if (apiKey) {
      try {
        source = 'brave'
        usedBraveFallback = true
        const results  = await fetchBraveResults(
          `${searchQuery} sold price site:ebay.com OR site:stockx.com OR site:mercari.com`,
          apiKey
        )
        const bravePrices = results
          .flatMap((r) => extractPricesFromText(`${r.title} ${r.description ?? ''}`).map((price) => ({
            title: r.title, price, url: r.url, soldDate: '',
          })))
        listings = [...listings, ...bravePrices]
      } catch (e) {
        console.error('Brave fallback error:', e)
      }
    }
  }

  if (listings.length === 0) {
    const hint = manufacturer
      ? `Try making the item name more specific (e.g. add a model or set number).`
      : `Try adding the manufacturer or brand name.`
    return NextResponse.json(
      { error: `No sold listings found for "${name}". ${hint}` },
      { status: 404 }
    )
  }

  // ── Outlier removal + coherence check ─────────────────────────────────────
  const rawPrices     = listings.map((l) => l.price).sort((a, b) => a - b)
  const cleanedPrices = removeOutliers(rawPrices)
  const cleanLow      = cleanedPrices[0]
  const cleanHigh     = cleanedPrices[cleanedPrices.length - 1]
  const spreadRatio   = cleanLow > 0 ? cleanHigh / cleanLow : Infinity

  if (cleanedPrices.length < 2) {
    return NextResponse.json(
      { error: `Only one matching listing found for "${name}" — not enough for a reliable estimate. Check eBay directly for the most accurate value.` },
      { status: 404 }
    )
  }

  if (spreadRatio > 10) {
    return NextResponse.json(
      { error: `Listings found but prices vary too widely ($${Math.round(cleanLow).toLocaleString()}–$${Math.round(cleanHigh).toLocaleString()}) — the search may have matched different items. Try adding the manufacturer or a model number.` },
      { status: 404 }
    )
  }

  // ── Statistics ─────────────────────────────────────────────────────────────
  const sum     = cleanedPrices.reduce((a, b) => a + b, 0)
  const average = Math.round(sum / cleanedPrices.length)
  const low     = Math.round(cleanLow)
  const high    = Math.round(cleanHigh)

  const spread = high > 0 ? (high - low) / high : 1
  const confidence: 'high' | 'medium' | 'low' =
    cleanedPrices.length >= 5 && spread < 0.3 ? 'high'
    : cleanedPrices.length >= 3 && spread < 0.6 ? 'medium'
    : 'low'

  // Build source links from relevant listings (closest to average)
  const sourceLinks = [...listings]
    .filter((l) => relevanceScore(l.title, name, manufacturer) >= 0.4)
    .sort((a, b) => Math.abs(a.price - average) - Math.abs(b.price - average))
    .slice(0, 4)
    .map((l) => ({ title: l.title, url: l.url, source: 'eBay', price: Math.round(l.price) }))

  const outlierCount = rawPrices.length - cleanedPrices.length
  const usd = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const summary =
    `${cleanedPrices.length} sold listing${cleanedPrices.length !== 1 ? 's' : ''} on eBay` +
    (outlierCount > 0 ? ` (${outlierCount} outlier${outlierCount !== 1 ? 's' : ''} removed)` : '') +
    `. Range: ${usd(low)}–${usd(high)}.` +
    (usedBraveFallback ? ` (Limited eBay results — supplemented with web search.)` : '')

  const sources = usedBraveFallback ? ['eBay', 'Web'] : ['eBay']

  // ── Increment quota + save history ────────────────────────────────────────
  await prisma.user.update({ where: { id: user.id }, data: { marketLookupCount: { increment: 1 } } })

  if (itemId) {
    try {
      await prisma.priceHistory.create({ data: { itemId, price: average, source: 'search' } })
    } catch (e) {
      console.error('Price history save failed:', e)
    }
  }

  return NextResponse.json({ average, low, high, confidence, sources, sourceLinks, summary })
}
