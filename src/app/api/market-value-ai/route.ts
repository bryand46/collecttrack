import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withinLookupLimit, needsLookupReset, type Plan } from '@/lib/plans'

// ── Price extraction helpers ─────────────────────────────────────────────────

/** Pull every dollar amount out of a string, e.g. "$120", "$1,200", "$85.00" */
function extractPrices(text: string): number[] {
  const matches = text.match(/\$\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/g) ?? []
  return matches
    .map((m) => parseFloat(m.replace(/[$,\s]/g, '')))
    .filter((n) => n >= 1 && n <= 500_000)   // sanity range
}

/** Detect obvious site names from a URL */
function sourceName(url: string): string {
  try {
    const host = new URL(url).hostname.replace('www.', '')
    if (host.includes('ebay'))        return 'eBay'
    if (host.includes('stockx'))      return 'StockX'
    if (host.includes('amazon'))      return 'Amazon'
    if (host.includes('etsy'))        return 'Etsy'
    if (host.includes('mercari'))     return 'Mercari'
    if (host.includes('poshmark'))    return 'Poshmark'
    if (host.includes('grailed'))     return 'Grailed'
    if (host.includes('pricecharting')) return 'PriceCharting'
    if (host.includes('tcgplayer'))   return 'TCGPlayer'
    if (host.includes('goldin'))      return 'Goldin'
    if (host.includes('comc'))        return 'COMC'
    return host.split('.')[0]
  } catch {
    return 'Web'
  }
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query     = searchParams.get('q')
  const condition = searchParams.get('condition') ?? ''
  const edition   = searchParams.get('edition')   ?? ''

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
  }

  // ── Quota check (shared counter) ──────────────────────────────────────────
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

  // ── Brave Search API ───────────────────────────────────────────────────────
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Brave Search API key not configured. Add BRAVE_SEARCH_API_KEY to your environment variables.' },
      { status: 503 }
    )
  }

  // Build a focused resale-value query
  const searchQuery = [
    query,
    edition   ? `"${edition}"` : '',
    condition ? condition       : '',
    'resale value price sold',
  ].filter(Boolean).join(' ')

  const braveUrl = new URL('https://api.search.brave.com/res/v1/web/search')
  braveUrl.searchParams.set('q', searchQuery)
  braveUrl.searchParams.set('count', '10')          // max results
  braveUrl.searchParams.set('safesearch', 'moderate')
  braveUrl.searchParams.set('freshness', 'py')      // past year only

  let results: Array<{ title: string; url: string; description: string }>
  try {
    const res = await fetch(braveUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      next: { revalidate: 3600 },   // cache for 1 hour per item
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Brave Search error:', err)
      return NextResponse.json({ error: 'Search request failed. Try again shortly.' }, { status: 502 })
    }

    const data = await res.json()
    results = data?.web?.results ?? []
  } catch (err) {
    console.error('Brave fetch error:', err)
    return NextResponse.json({ error: 'Could not reach search service.' }, { status: 502 })
  }

  if (results.length === 0) {
    return NextResponse.json({ error: 'No results found for this item.' }, { status: 404 })
  }

  // ── Extract prices from titles + descriptions ──────────────────────────────
  const pricesByResult: Array<{ prices: number[]; source: string; url: string; title: string }> = []

  for (const r of results) {
    const combined = `${r.title} ${r.description ?? ''}`
    const prices   = extractPrices(combined)
    if (prices.length > 0) {
      pricesByResult.push({
        prices,
        source: sourceName(r.url),
        url:    r.url,
        title:  r.title,
      })
    }
  }

  // Flatten all prices for statistics
  const allPrices = pricesByResult.flatMap((r) => r.prices).sort((a, b) => a - b)

  if (allPrices.length === 0) {
    return NextResponse.json(
      { error: 'No price data found in search results. Try a more specific item name.' },
      { status: 404 }
    )
  }

  // Trim top and bottom 10% to reduce noise
  const trimCount = Math.floor(allPrices.length * 0.1)
  const trimmed   = allPrices.slice(trimCount, allPrices.length - trimCount || undefined)
  const workingSet = trimmed.length >= 3 ? trimmed : allPrices

  const sum     = workingSet.reduce((a, b) => a + b, 0)
  const average = Math.round(sum / workingSet.length)
  const low     = Math.round(workingSet[0])
  const high    = Math.round(workingSet[workingSet.length - 1])

  // Confidence: based on number of results with prices and spread
  const spread = high > 0 ? (high - low) / high : 1
  const confidence: 'high' | 'medium' | 'low' =
    pricesByResult.length >= 4 && spread < 0.5 ? 'high'
    : pricesByResult.length >= 2 && spread < 0.8 ? 'medium'
    : 'low'

  // Unique sources list
  const sources = [...new Set(pricesByResult.map((r) => r.source))].slice(0, 5)

  // Top source links to show in the UI
  const sourceLinks = pricesByResult.slice(0, 4).map((r) => ({
    title:  r.title,
    url:    r.url,
    source: r.source,
    price:  Math.round(r.prices[0]),
  }))

  // Summary sentence
  const summary = `Found ${allPrices.length} price mention${allPrices.length !== 1 ? 's' : ''} across ${sources.join(', ')}. Values ranged from ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(low)} to ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(high)}.`

  // Increment lookup count
  await prisma.user.update({
    where: { id: user.id },
    data: { marketLookupCount: { increment: 1 } },
  })

  return NextResponse.json({
    average,
    low,
    high,
    confidence,
    sources,
    sourceLinks,
    summary,
  })
}
