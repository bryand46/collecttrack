import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withinLookupLimit, needsLookupReset, type Plan } from '@/lib/plans'

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractPrices(text: string): number[] {
  const matches = text.match(/\$\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/g) ?? []
  return matches
    .map((m) => parseFloat(m.replace(/[$,\s]/g, '')))
    .filter((n) => n >= 5 && n <= 500_000)
}

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
    return host.split('.')[0]
  } catch {
    return 'Web'
  }
}

async function searchBrave(
  query: string,
  apiKey: string
): Promise<Array<{ title: string; url: string; description: string }>> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', '10')
  url.searchParams.set('safesearch', 'moderate')
  url.searchParams.set('freshness', 'py')

  const res = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  })
  if (!res.ok) throw new Error(`Brave API error ${res.status}`)
  const data = await res.json()
  return data?.web?.results ?? []
}

function extractPricesFromResults(
  results: Array<{ title: string; url: string; description: string }>
): Array<{ prices: number[]; source: string; url: string; title: string }> {
  const out = []
  for (const r of results) {
    const prices = extractPrices(`${r.title} ${r.description ?? ''}`)
    if (prices.length > 0) {
      out.push({ prices, source: sourceName(r.url), url: r.url, title: r.title })
    }
  }
  return out
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const name         = (searchParams.get('name') || searchParams.get('q') || '').trim()
  const manufacturer = (searchParams.get('manufacturer') || '').trim()
  const condition    = (searchParams.get('condition') || '').trim()
  const edition      = (searchParams.get('edition') || '').trim()

  if (!name) {
    return NextResponse.json({ error: 'Missing item name' }, { status: 400 })
  }

  // ── Quota ─────────────────────────────────────────────────────────────────
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let { marketLookupCount, marketLookupResetAt } = user
  if (needsLookupReset(marketLookupResetAt)) {
    marketLookupCount = 0
    await prisma.user.update({
      where: { id: user.id },
      data: { marketLookupCount: 0, marketLookupResetAt: new Date() },
    })
  }
  if (!withinLookupLimit(user.plan as Plan, marketLookupCount)) {
    return NextResponse.json(
      { error: 'Monthly lookup limit reached', plan: user.plan, upgradePath: '/pricing' },
      { status: 403 }
    )
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Brave Search API key not configured.' },
      { status: 503 }
    )
  }

  // ── Two-pass search strategy ───────────────────────────────────────────────
  // Pass 1 (strict): quote both name AND manufacturer — prevents cross-category
  //   contamination (e.g. "Batman" matching Funko Pops when we mean Sideshow).
  // Pass 2 (relaxed): if strict returns no prices, drop the quotes and try
  //   manufacturer + name as plain terms — helps generic names like "Lighthouse"
  //   where quoting is too restrictive.

  const editionStr  = edition && edition !== '__other__' ? `"${edition}"` : ''
  const strictQuery = [`"${name}"`, manufacturer ? `"${manufacturer}"` : '', editionStr, 'sold price']
    .filter(Boolean).join(' ')
  const relaxedQuery = [manufacturer, name, editionStr, 'sold price']
    .filter(Boolean).join(' ')

  let results: Array<{ title: string; url: string; description: string }> = []
  let usedFallback = false

  try {
    results = await searchBrave(strictQuery, apiKey)

    // If strict search found results but none have prices, try relaxed
    const strictPrices = extractPricesFromResults(results)
    if (strictPrices.flatMap((r) => r.prices).length === 0 && relaxedQuery !== strictQuery) {
      const relaxedResults = await searchBrave(relaxedQuery, apiKey)
      if (relaxedResults.length > 0) {
        results = relaxedResults
        usedFallback = true
      }
    }
  } catch (err) {
    console.error('Brave fetch error:', err)
    return NextResponse.json({ error: 'Could not reach search service.' }, { status: 502 })
  }

  if (results.length === 0) {
    return NextResponse.json(
      { error: `No results found for "${name}"${manufacturer ? ` by ${manufacturer}` : ''}. Try making the item name more specific (e.g. include a set number or model name).` },
      { status: 404 }
    )
  }

  // ── Extract & clean prices ─────────────────────────────────────────────────
  const pricesByResult = extractPricesFromResults(results)
  const rawPrices = pricesByResult.flatMap((r) => r.prices).sort((a, b) => a - b)

  if (rawPrices.length === 0) {
    // Context-aware hint
    const hint = manufacturer
      ? `Try making the item name more specific — e.g. include a model number, set number, or edition.`
      : `Try adding the manufacturer name for a more precise search.`
    return NextResponse.json(
      { error: `Found search results for "${name}" but couldn't extract any prices. ${hint}` },
      { status: 404 }
    )
  }

  const cleanedPrices = removeOutliers(rawPrices)
  const cleanLow      = cleanedPrices[0]
  const cleanHigh     = cleanedPrices[cleanedPrices.length - 1]
  const spreadRatio   = cleanLow > 0 ? cleanHigh / cleanLow : Infinity

  if (cleanedPrices.length < 2) {
    return NextResponse.json(
      { error: `Only one price point found for "${name}" — not enough for a reliable estimate. Check eBay or StockX directly for the most accurate value.` },
      { status: 404 }
    )
  }

  if (spreadRatio > 10) {
    return NextResponse.json(
      { error: `Prices found but they're too inconsistent ($${Math.round(cleanLow).toLocaleString()}–$${Math.round(cleanHigh).toLocaleString()}) — the search likely matched different items. Try adding a model or set number to the item name.` },
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
    pricesByResult.length >= 4 && spread < 0.4 ? 'high'
    : pricesByResult.length >= 2 && spread < 0.7 ? 'medium'
    : 'low'

  const sources     = [...new Set(pricesByResult.map((r) => r.source))].slice(0, 5)
  const sourceLinks = pricesByResult.slice(0, 4).map((r) => ({
    title:  r.title,
    url:    r.url,
    source: r.source,
    price:  Math.round(r.prices[0]),
  }))

  const usd = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const outlierCount = rawPrices.length - cleanedPrices.length
  const summary =
    `Found ${cleanedPrices.length} price point${cleanedPrices.length !== 1 ? 's' : ''}` +
    (outlierCount > 0 ? ` (${outlierCount} outlier${outlierCount !== 1 ? 's' : ''} removed)` : '') +
    ` across ${sources.join(', ')}` +
    (usedFallback ? ` — used broader search terms to find results` : '') +
    `.`

  await prisma.user.update({
    where: { id: user.id },
    data: { marketLookupCount: { increment: 1 } },
  })

  return NextResponse.json({ average, low, high, confidence, sources, sourceLinks, summary })
}
