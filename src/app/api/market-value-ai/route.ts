import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withinLookupLimit, needsLookupReset, type Plan } from '@/lib/plans'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Pull dollar amounts from a string — ignores cents-only values like $0.99 */
function extractPrices(text: string): number[] {
  const matches = text.match(/\$\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/g) ?? []
  return matches
    .map((m) => parseFloat(m.replace(/[$,\s]/g, '')))
    .filter((n) => n >= 5 && n <= 500_000)
}

/**
 * IQR-based outlier removal.
 * Removes prices that fall outside [Q1 − 1.5×IQR, Q3 + 1.5×IQR].
 * Requires at least 4 values to make meaningful quartiles; returns original
 * array unchanged if there aren't enough.
 */
function removeOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices
  const s  = [...prices].sort((a, b) => a - b)
  const q1 = s[Math.floor(s.length * 0.25)]
  const q3 = s[Math.floor(s.length * 0.75)]
  const iqr = q3 - q1
  // If IQR is 0 (all same value) keep everything
  if (iqr === 0) return prices
  const lower = q1 - 1.5 * iqr
  const upper = q3 + 1.5 * iqr
  return s.filter((p) => p >= lower && p <= upper)
}

/** Detect site name from URL */
function sourceName(url: string): string {
  try {
    const host = new URL(url).hostname.replace('www.', '')
    if (host.includes('ebay'))          return 'eBay'
    if (host.includes('stockx'))        return 'StockX'
    if (host.includes('amazon'))        return 'Amazon'
    if (host.includes('etsy'))          return 'Etsy'
    if (host.includes('mercari'))       return 'Mercari'
    if (host.includes('poshmark'))      return 'Poshmark'
    if (host.includes('grailed'))       return 'Grailed'
    if (host.includes('pricecharting')) return 'PriceCharting'
    if (host.includes('tcgplayer'))     return 'TCGPlayer'
    if (host.includes('goldin'))        return 'Goldin'
    if (host.includes('comc'))          return 'COMC'
    if (host.includes('sideshow'))      return 'Sideshow'
    if (host.includes('bigbadtoystore'))return 'BigBadToyStore'
    if (host.includes('hobbylink'))     return 'HobbyLinkJapan'
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
  // Accept name + manufacturer separately so we can quote them precisely
  const name         = (searchParams.get('name') || searchParams.get('q') || '').trim()
  const manufacturer = (searchParams.get('manufacturer') || '').trim()
  const condition    = (searchParams.get('condition') || '').trim()
  const edition      = (searchParams.get('edition') || '').trim()

  if (!name) {
    return NextResponse.json({ error: 'Missing item name' }, { status: 400 })
  }

  // ── Quota check ───────────────────────────────────────────────────────────
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

  // ── Brave Search ──────────────────────────────────────────────────────────
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Brave Search API key not configured. Add BRAVE_SEARCH_API_KEY to your environment variables.' },
      { status: 503 }
    )
  }

  // Quote both name and manufacturer so results must contain those exact terms.
  // This prevents "Batman" returning Funko Pop results when we mean
  // "Batman Premium Format Figure by Sideshow Collectibles".
  const quotedName = `"${name}"`
  const quotedMfr  = manufacturer ? `"${manufacturer}"` : ''
  const editionStr = edition && edition !== '__other__' ? `"${edition}"` : ''

  const searchQuery = [quotedName, quotedMfr, editionStr, 'sold price']
    .filter(Boolean)
    .join(' ')

  const braveUrl = new URL('https://api.search.brave.com/res/v1/web/search')
  braveUrl.searchParams.set('q', searchQuery)
  braveUrl.searchParams.set('count', '10')
  braveUrl.searchParams.set('safesearch', 'moderate')
  braveUrl.searchParams.set('freshness', 'py')   // past year

  let results: Array<{ title: string; url: string; description: string }>
  try {
    const res = await fetch(braveUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      next: { revalidate: 3600 },
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
    return NextResponse.json(
      { error: `No search results found for "${name}"${manufacturer ? ` by ${manufacturer}` : ''}. Try adjusting the item name.` },
      { status: 404 }
    )
  }

  // ── Extract prices ────────────────────────────────────────────────────────
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

  const rawPrices = pricesByResult.flatMap((r) => r.prices).sort((a, b) => a - b)

  if (rawPrices.length === 0) {
    return NextResponse.json(
      { error: 'Search results found but no price data could be extracted. Try including the manufacturer name.' },
      { status: 404 }
    )
  }

  // ── Outlier removal (IQR method) ──────────────────────────────────────────
  const cleanedPrices = removeOutliers(rawPrices)

  // ── Coherence check ───────────────────────────────────────────────────────
  // If the cleaned price spread is still wider than 10× the lowest value,
  // the data is too noisy to trust — refuse to give a number.
  const cleanLow  = cleanedPrices[0]
  const cleanHigh = cleanedPrices[cleanedPrices.length - 1]
  const spreadRatio = cleanLow > 0 ? cleanHigh / cleanLow : Infinity

  if (cleanedPrices.length < 2) {
    return NextResponse.json(
      {
        error: `Only one price data point found — not enough to give a reliable estimate for "${name}". ` +
               `Try searching manually on eBay or StockX for the most accurate value.`,
      },
      { status: 404 }
    )
  }

  if (spreadRatio > 10) {
    return NextResponse.json(
      {
        error: `Price data found but results are inconsistent (ranging from $${Math.round(cleanLow).toLocaleString()} to $${Math.round(cleanHigh).toLocaleString()}). ` +
               `This usually means the search matched different items. Try adding the manufacturer name for a more precise lookup.`,
      },
      { status: 404 }
    )
  }

  // ── Statistics ────────────────────────────────────────────────────────────
  const sum     = cleanedPrices.reduce((a, b) => a + b, 0)
  const average = Math.round(sum / cleanedPrices.length)
  const low     = Math.round(cleanLow)
  const high    = Math.round(cleanHigh)

  // Confidence: how many independent sources + how tight the spread is
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

  const summary =
    `Found ${cleanedPrices.length} price point${cleanedPrices.length !== 1 ? 's' : ''} ` +
    `(${rawPrices.length - cleanedPrices.length > 0 ? `${rawPrices.length - cleanedPrices.length} outlier${rawPrices.length - cleanedPrices.length !== 1 ? 's' : ''} removed, ` : ''}` +
    `range ${usd(low)}–${usd(high)}) across ${sources.join(', ')}.`

  // ── Increment quota ───────────────────────────────────────────────────────
  await prisma.user.update({
    where: { id: user.id },
    data: { marketLookupCount: { increment: 1 } },
  })

  return NextResponse.json({ average, low, high, confidence, sources, sourceLinks, summary })
}
