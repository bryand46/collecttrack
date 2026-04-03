import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withinLookupLimit, needsLookupReset, type Plan } from '@/lib/plans'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract dollar amounts. Requires at least 2 digits before the decimal
 * so we don't pick up things like "$5 shipping" or "$1.99 fee" alongside
 * a $650 statue price — minimum $10.
 */
function extractPrices(text: string): number[] {
  const matches = text.match(/\$\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/g) ?? []
  return matches
    .map((m) => parseFloat(m.replace(/[$,\s]/g, '')))
    .filter((n) => n >= 10 && n <= 500_000)
}

/** IQR outlier removal — needs ≥4 values to be meaningful */
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

function sourceName(url: string): string {
  try {
    const host = new URL(url).hostname.replace('www.', '')
    if (host.includes('ebay'))           return 'eBay'
    if (host.includes('stockx'))         return 'StockX'
    if (host.includes('amazon'))         return 'Amazon'
    if (host.includes('etsy'))           return 'Etsy'
    if (host.includes('mercari'))        return 'Mercari'
    if (host.includes('poshmark'))       return 'Poshmark'
    if (host.includes('grailed'))        return 'Grailed'
    if (host.includes('pricecharting'))  return 'PriceCharting'
    if (host.includes('tcgplayer'))      return 'TCGPlayer'
    if (host.includes('goldin'))         return 'Goldin'
    if (host.includes('comc'))           return 'COMC'
    if (host.includes('sideshow'))       return 'Sideshow'
    if (host.includes('bigbadtoystore')) return 'BigBadToyStore'
    if (host.includes('lego'))           return 'LEGO'
    if (host.includes('bricklink'))      return 'BrickLink'
    return host.split('.')[0]
  } catch { return 'Web' }
}

type SearchResult = { title: string; url: string; description: string }
type PriceResult  = { prices: number[]; source: string; url: string; title: string }

async function braveSearch(query: string, apiKey: string): Promise<SearchResult[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', '10')
  url.searchParams.set('safesearch', 'moderate')
  url.searchParams.set('freshness', 'py')
  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': apiKey },
  })
  if (!res.ok) throw new Error(`Brave ${res.status}`)
  const data = await res.json()
  return data?.web?.results ?? []
}

function toPriceResults(results: SearchResult[]): PriceResult[] {
  return results
    .map((r) => ({
      prices: extractPrices(`${r.title} ${r.description ?? ''}`),
      source: sourceName(r.url),
      url:    r.url,
      title:  r.title,
    }))
    .filter((r) => r.prices.length > 0)
}

// ── Route ────────────────────────────────────────────────────────────────────

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
  const itemId       = (sp.get('itemId') || '').trim()   // optional — for saving history

  if (!name) return NextResponse.json({ error: 'Missing item name' }, { status: 400 })

  // ── Quota ─────────────────────────────────────────────────────────────────
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

  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Brave Search API key not configured.' }, { status: 503 })

  const editionStr = edition && edition !== '__other__' ? `"${edition}"` : ''
  const mfrStr     = manufacturer ? `"${manufacturer}"` : ''

  // ── Three-pass search strategy ────────────────────────────────────────────
  //
  // Pass 1 — Marketplace-scoped, quoted terms.
  //   Searches eBay, StockX, Mercari directly. These pages reliably show
  //   item prices in their titles/snippets, making extraction accurate.
  //
  // Pass 2 — Marketplace-scoped, unquoted.
  //   Same sites but without strict quoting. Catches generic names like
  //   "Lighthouse" where quoting is too restrictive.
  //
  // Pass 3 — General web fallback.
  //   Broad search across any site if marketplace searches both fail.
  //
  const marketplaceSites = 'site:ebay.com OR site:stockx.com OR site:mercari.com OR site:bricklink.com OR site:pricecharting.com'
  const pass1 = [`"${name}"`, mfrStr, editionStr, 'sold', marketplaceSites].filter(Boolean).join(' ')
  const pass2 = [manufacturer, name, editionStr, 'sold price', marketplaceSites].filter(Boolean).join(' ')
  const pass3 = [mfrStr, `"${name}"`, editionStr, 'sold resale value price'].filter(Boolean).join(' ')

  let priceResults: PriceResult[] = []
  let passUsed = 1

  try {
    // Pass 1
    const r1 = await braveSearch(pass1, apiKey)
    priceResults = toPriceResults(r1)

    // Pass 2 if pass 1 found no prices
    if (priceResults.length === 0) {
      passUsed = 2
      const r2 = await braveSearch(pass2, apiKey)
      priceResults = toPriceResults(r2)
    }

    // Pass 3 if both marketplace searches failed
    if (priceResults.length === 0) {
      passUsed = 3
      const r3 = await braveSearch(pass3, apiKey)
      priceResults = toPriceResults(r3)
    }
  } catch (err) {
    console.error('Brave fetch error:', err)
    return NextResponse.json({ error: 'Could not reach search service.' }, { status: 502 })
  }

  const rawPrices = priceResults.flatMap((r) => r.prices).sort((a, b) => a - b)

  if (rawPrices.length === 0) {
    const hint = manufacturer
      ? `Try making the item name more specific — e.g. include a model or set number.`
      : `Try adding the manufacturer name for a more targeted search.`
    return NextResponse.json(
      { error: `No price data found for "${name}". ${hint}` },
      { status: 404 }
    )
  }

  // ── Outlier removal + coherence check ────────────────────────────────────
  const cleanedPrices = removeOutliers(rawPrices)
  const cleanLow  = cleanedPrices[0]
  const cleanHigh = cleanedPrices[cleanedPrices.length - 1]
  const spreadRatio = cleanLow > 0 ? cleanHigh / cleanLow : Infinity

  if (cleanedPrices.length < 2) {
    return NextResponse.json(
      { error: `Only one price point found for "${name}" — not enough for a reliable estimate. Check eBay directly for the most accurate value.` },
      { status: 404 }
    )
  }

  if (spreadRatio > 10) {
    return NextResponse.json(
      { error: `Prices found but too inconsistent ($${Math.round(cleanLow).toLocaleString()}–$${Math.round(cleanHigh).toLocaleString()}) — search likely matched different items. Try adding a model or set number to the item name.` },
      { status: 404 }
    )
  }

  // ── Statistics ────────────────────────────────────────────────────────────
  const sum     = cleanedPrices.reduce((a, b) => a + b, 0)
  const average = Math.round(sum / cleanedPrices.length)
  const low     = Math.round(cleanLow)
  const high    = Math.round(cleanHigh)

  const spread = high > 0 ? (high - low) / high : 1
  const confidence: 'high' | 'medium' | 'low' =
    priceResults.length >= 4 && spread < 0.4 ? 'high'
    : priceResults.length >= 2 && spread < 0.7 ? 'medium'
    : 'low'

  const sources     = [...new Set(priceResults.map((r) => r.source))].slice(0, 5)
  const sourceLinks = priceResults.slice(0, 4).map((r) => ({
    title: r.title, url: r.url, source: r.source, price: Math.round(r.prices[0]),
  }))

  const usd = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const outlierCount = rawPrices.length - cleanedPrices.length
  const summary =
    `Found ${cleanedPrices.length} price point${cleanedPrices.length !== 1 ? 's' : ''}` +
    (outlierCount > 0 ? ` (${outlierCount} outlier${outlierCount !== 1 ? 's' : ''} removed)` : '') +
    ` across ${sources.join(', ')}` +
    (passUsed > 1 ? ` — used broader search to find results` : '') +
    `.`

  // ── Increment quota ───────────────────────────────────────────────────────
  await prisma.user.update({ where: { id: user.id }, data: { marketLookupCount: { increment: 1 } } })

  // ── Save to price history if itemId provided ──────────────────────────────
  if (itemId) {
    try {
      await prisma.priceHistory.create({
        data: { itemId, price: average, source: 'search' },
      })
    } catch (e) {
      // Non-fatal — don't fail the whole request if history save fails
      console.error('Price history save failed:', e)
    }
  }

  return NextResponse.json({ average, low, high, confidence, sources, sourceLinks, summary })
}
