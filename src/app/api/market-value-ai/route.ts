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
 * Clamp prices to within `factor`x of the median.
 * e.g. factor=4 with median=$400 → keeps $100–$1600.
 * This runs BEFORE IQR to eliminate items that are clearly different products
 * (e.g. $20 loose accessories or $2,000 factory-sealed rare pieces when
 * the bulk of results cluster around $400).
 */
function clampToMedianRange(prices: number[], factor = 4): number[] {
  if (prices.length < 2) return prices  // need at least 2 to have a meaningful median
  const sorted = [...prices].sort((a, b) => a - b)
  // For 2 prices, use the higher one as the "anchor" (more likely the true sold price
  // for a collectible; the lower one is often a shipping cost, partial payment, etc.)
  const median = prices.length === 2
    ? sorted[1]
    : sorted[Math.floor(sorted.length / 2)]
  if (median <= 0) return prices
  return sorted.filter((p) => p >= median / factor && p <= median * factor)
}

/**
 * Title relevance check — does this listing title contain enough of the key
 * words from the item name / manufacturer to be the same product?
 *
 * Returns a score 0–1. Hard rule: if a manufacturer is specified, the title
 * MUST contain at least one manufacturer word; otherwise the score is capped
 * just below 0.5 (below the filter threshold).
 * This prevents "$20 Poison Ivy figure by some other brand" from contaminating
 * results for a $450 Sideshow Collectibles Poison Ivy statue.
 */
function relevanceScore(title: string, name: string, manufacturer: string): number {
  const t        = title.toLowerCase()
  const nameWords = name.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
  const mfrWords  = manufacturer.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
  const allWords  = [...nameWords, ...mfrWords]

  if (allWords.length === 0) return 1

  const hits = allWords.filter((w) => t.includes(w)).length
  const score = hits / allWords.length

  // Manufacturer gate: if a manufacturer was specified, the listing title must
  // mention at least one manufacturer word. Without this, a "$20 Poison Ivy
  // Deadly Nature figure (Funko/McFarlane/etc)" would score 0.67 just from
  // matching all 4 item-name words, even though it's a completely different product.
  if (mfrWords.length > 0) {
    const mfrHits = mfrWords.filter((w) => t.includes(w)).length
    if (mfrHits === 0) return Math.min(score, 0.45) // force below 0.5 threshold
  }

  return score
}

// ── eBay scraper ─────────────────────────────────────────────────────────────

type EbayListing = { title: string; price: number; url: string; soldDate: string }

async function fetchEbaySoldListings(query: string): Promise<EbayListing[]> {
  const searchUrl =
    `https://www.ebay.com/sch/i.html?` +
    `_nkw=${encodeURIComponent(query)}` +
    `&LH_Sold=1&LH_Complete=1&_sacat=0&_from=R40&rt=nc`

  console.log(`[market-value] eBay fetch: ${searchUrl}`)

  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.208 Safari/537.36',
      'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control':   'no-cache',
      'Pragma':          'no-cache',
      'Sec-Fetch-Dest':  'document',
      'Sec-Fetch-Mode':  'navigate',
      'Sec-Fetch-Site':  'none',
      'Upgrade-Insecure-Requests': '1',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    console.log(`[market-value] eBay HTTP error: ${res.status}`)
    throw new Error(`eBay responded with ${res.status}`)
  }

  const html = await res.text()
  console.log(`[market-value] eBay HTML size: ${(html.length / 1024).toFixed(1)} KB`)

  // Detect block page / CAPTCHA / "Pardon Our Interruption"
  // eBay returns a tiny ~13KB page with this title when blocking data-center IPs
  if (
    html.includes('g-recaptcha') ||
    html.includes('Robot Check') ||
    html.includes('Pardon Our Interruption') ||
    html.includes('robot or a script') ||
    html.length < 30_000  // real results page is always 200KB+
  ) {
    console.log(`[market-value] eBay blocked request (htmlSize=${(html.length/1024).toFixed(1)}KB)`)
    throw new Error('eBay blocked this request')
  }
  if (!html.includes('ebay')) {
    console.log('[market-value] eBay response does not contain "ebay" — likely redirect/block')
    throw new Error('eBay returned an unexpected page')
  }

  // Diagnostic: log price-related class names found
  const priceClassMatches = html.match(/class="([^"]*price[^"]*)"/gi) ?? []
  const uniquePriceClasses = [...new Set(priceClassMatches)].slice(0, 5)
  console.log(`[market-value] Price classes in HTML: ${uniquePriceClasses.join(' | ') || 'NONE'}`)

  const listings: EbayListing[] = []
  const ebayBase = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1`

  // ── Strategy 1: split into per-listing blocks ──────────────────────────────
  // eBay wraps each result in a <li> with class containing "s-item" or "s-card"
  const blockRe = /<li[^>]+class="[^"]*(?:s-item|s-card)[^"]*"[^>]*>/gi
  const splitPoints: number[] = []
  let m: RegExpExecArray | null
  while ((m = blockRe.exec(html)) !== null) splitPoints.push(m.index)

  console.log(`[market-value] eBay s-item/s-card blocks found: ${splitPoints.length}`)

  for (let i = 0; i < splitPoints.length; i++) {
    const block = html.slice(splitPoints[i], splitPoints[i + 1] ?? splitPoints[i] + 4000)

    // ── Title: try several patterns eBay has used ──────────────────────────
    const rawTitle = (
      block.match(/class="[^"]*s-item__title[^"]*"[^>]*>\s*<span[^>]*>([^<]{5,})/i)?.[1] ||
      block.match(/class="[^"]*s-item__title[^"]*"[^>]*>([^<]{5,})/i)?.[1] ||
      block.match(/role="heading"[^>]*>\s*([^<]{5,})/i)?.[1] ||
      block.match(/class="[^"]*s-card__title[^"]*"[^>]*>([^<]{5,})/i)?.[1] ||
      ''
    ).trim().replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')

    if (!rawTitle || /shop on ebay|results for/i.test(rawTitle)) continue

    // ── Price: try every price-related class eBay has used ─────────────────
    // DevTools showed: class="su-styled-text positive bold large-1 s-card__price"
    // Older eBay used: class="s-item__price"
    // We match any class attribute that contains "price" anywhere in it
    const rawPrice = (
      block.match(/class="[^"]*s-item__price[^"]*"[^>]*>\s*\$\s*([\d,]+(?:\.\d{1,2})?)/i)?.[1] ||
      block.match(/class="[^"]*s-card__price[^"]*"[^>]*>\s*\$\s*([\d,]+(?:\.\d{1,2})?)/i)?.[1] ||
      block.match(/class="[^"]*(?:price)[^"]*"[^>]*>\s*\$\s*([\d,]+(?:\.\d{1,2})?)/i)?.[1] ||
      // last resort: first $ amount in block
      block.match(/>\s*\$\s*([\d,]+(?:\.\d{1,2})?)\s*</)?.[1]
    )
    if (!rawPrice) continue
    const price = parseFloat(rawPrice.replace(/,/g, ''))
    if (!price || price < 5 || price > 500_000) continue

    const url     = block.match(/href="(https:\/\/www\.ebay\.com\/itm\/[^"?]+)/)?.[1] ?? ebayBase
    const soldDate= block.match(/Sold\s+([\w]+ \d{1,2},?\s*\d{4})/i)?.[1] ?? ''

    listings.push({ title: rawTitle, price, url, soldDate })
  }

  console.log(`[market-value] Strategy 1 (block parse): ${listings.length} listings`)

  // ── Strategy 2: price sweep fallback ──────────────────────────────────────
  // If block parsing found nothing, sweep the entire HTML for dollar amounts.
  // Since we searched specifically for the item+manufacturer, the prices on
  // this page are overwhelmingly for the correct item. IQR filters outliers.
  if (listings.length === 0) {
    const priceMatches = [...html.matchAll(/>\s*\$\s*([\d,]+(?:\.\d{1,2})?)\s*</g)]
    for (const pm of priceMatches) {
      const price = parseFloat(pm[1].replace(/,/g, ''))
      if (price >= 10 && price <= 500_000) {
        listings.push({ title: query, price, url: ebayBase, soldDate: '' })
      }
    }
    console.log(`[market-value] Strategy 2 (full sweep): ${listings.length} prices`)
  }

  return listings
}

// ── Brave fallback ────────────────────────────────────────────────────────────

type SearchResult = { title: string; url: string; description: string }

async function fetchBraveResults(query: string, apiKey: string, count = 10): Promise<SearchResult[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', String(count))
  url.searchParams.set('safesearch', 'moderate')
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

/**
 * Use Brave Search to find eBay sold-listing prices when direct eBay scraping is blocked.
 *
 * Strategy: run TWO Brave queries:
 *   1. site:ebay.com/itm   — individual listing pages (have exact sold prices in title/snippet)
 *   2. General sold search  — catches StockX, Mercari, other platforms as extra data points
 *
 * For each result we look first for an explicit "sold for $X" pattern, then fall back to
 * any dollar amount in the snippet. Results are tagged with a title reconstructed from
 * the search snippet so the relevance filter still works.
 */
async function fetchBravePrices(
  name: string,
  manufacturer: string,
  apiKey: string
): Promise<EbayListing[]> {
  const base = [name, manufacturer].filter(Boolean).join(' ')
  const ebayBase = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(base)}&LH_Sold=1`
  const listings: EbayListing[] = []

  // Query 1: eBay individual item pages (most reliable for exact prices)
  const q1Results = await fetchBraveResults(
    `${base} sold site:ebay.com/itm`, apiKey, 10
  )
  console.log(`[market-value] Brave Q1 (ebay.com/itm): ${q1Results.length} results`)

  // Query 2: broader sold search across marketplaces
  const q2Results = await fetchBraveResults(
    `${base} sold price completed listing`, apiKey, 10
  )
  console.log(`[market-value] Brave Q2 (broad sold): ${q2Results.length} results`)

  for (const r of [...q1Results, ...q2Results]) {
    const text = `${r.title ?? ''} ${r.description ?? ''}`

    // Prefer explicit "sold for $X" pattern
    const soldMatch = text.match(/sold\s+(?:for\s+)?\$\s*([\d,]+(?:\.\d{1,2})?)/i)
    if (soldMatch) {
      const price = parseFloat(soldMatch[1].replace(/,/g, ''))
      if (price >= 10 && price <= 500_000) {
        listings.push({ title: r.title ?? base, price, url: r.url ?? ebayBase, soldDate: '' })
        continue
      }
    }

    // Fall back: any dollar amounts in the snippet
    const prices = extractPricesFromText(text)
    for (const price of prices.slice(0, 2)) {
      listings.push({ title: r.title ?? base, price, url: r.url ?? ebayBase, soldDate: '' })
    }
  }

  console.log(`[market-value] Brave total raw listings: ${listings.length}`)
  return listings
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
  // Use name + manufacturer ONLY — do NOT include edition in the eBay query.
  // Including edition tags like "Exclusive" causes eBay to return 0 exact matches
  // and fall back to "Results matching fewer words", which drags in unrelated items.
  // Edition is an inconsistently-used label that collectors add to listings; it should
  // not be part of the search string. Name + manufacturer is specific enough.
  const searchQuery = [name, manufacturer].filter(Boolean).join(' ')

  // ── Primary: eBay sold listings ────────────────────────────────────────────
  let listings: EbayListing[] = []
  let source: 'ebay' | 'brave' = 'ebay'

  try {
    // Pass 1: full query (name + manufacturer)
    const raw = await fetchEbaySoldListings(searchQuery)

    // Filter to listings whose titles are actually relevant to this item.
    // Threshold 0.6 = at least 60% of key words must appear in the listing title.
    // This prevents:
    //   - $12 Funko Pops (score ~0.33) mixing into $450 Sideshow results
    //   - Different Sideshow Poison Ivy statues without the "Deadly Nature" subtitle (score ~0.50)
    const RELEVANCE_THRESHOLD = 0.6
    listings = raw.filter(
      (l) => relevanceScore(l.title, name, manufacturer) >= RELEVANCE_THRESHOLD
    )

    // Pass 2: if we got 0 relevant results and a manufacturer was provided,
    // try a broader search using just the item name (manufacturer may be too restrictive
    // for eBay's text search, or listings may omit it in the title).
    if (listings.length === 0 && manufacturer) {
      console.log(`[market-value] Pass 1 returned 0 relevant results — retrying with name only: "${name}"`)
      const raw2 = await fetchEbaySoldListings(name)
      const pass2 = raw2.filter(
        (l) => relevanceScore(l.title, name, manufacturer) >= RELEVANCE_THRESHOLD
      )
      console.log(`[market-value] Pass 2 returned ${pass2.length} relevant results`)
      listings = pass2
    }
  } catch (err) {
    console.error('[market-value] eBay fetch error:', err)
    // Fall through to Brave
  }

  // ── Fallback: Brave Search ─────────────────────────────────────────────────
  // Used whenever eBay is blocked (very common on Vercel's data-center IPs) or
  // returns fewer than 2 relevant listings.
  let usedBraveFallback = false
  if (listings.length < 2) {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY
    if (apiKey) {
      try {
        source = 'brave'
        usedBraveFallback = true
        const braveRaw = await fetchBravePrices(name, manufacturer, apiKey)
        // Apply same relevance filter — Brave titles are often full eBay listing titles
        const RELEVANCE_THRESHOLD = 0.6
        const braveFiltered = braveRaw.filter(
          (l) => relevanceScore(l.title, name, manufacturer) >= RELEVANCE_THRESHOLD
        )
        console.log(`[market-value] Brave after relevance filter: ${braveFiltered.length} listings`)
        listings = [...listings, ...braveFiltered]
      } catch (e) {
        console.error('[market-value] Brave fallback error:', e)
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
  // Step 1: clamp to within 4x of median (removes obviously wrong items —
  //         e.g. $20 loose accessories mixed in with $450 premium statues)
  // Step 2: IQR removes statistical outliers from what's left
  const rawPrices     = listings.map((l) => l.price).sort((a, b) => a - b)
  const medianClamped = clampToMedianRange(rawPrices, 4)
  const cleanedPrices = removeOutliers(medianClamped)
  console.log(`[market-value] Prices raw:${rawPrices.length} → medianClamp:${medianClamped.length} → IQR:${cleanedPrices.length}`)
  const cleanLow      = cleanedPrices[0]
  const cleanHigh     = cleanedPrices[cleanedPrices.length - 1]
  const spreadRatio   = cleanLow > 0 ? cleanHigh / cleanLow : Infinity

  if (cleanedPrices.length < 2) {
    return NextResponse.json(
      { error: `Only one matching listing found for "${name}" — not enough for a reliable estimate. Check eBay directly for the most accurate value.` },
      { status: 404 }
    )
  }

  // Coherence check: if the cleaned price range is still > 15x wide, the results
  // are too mixed to give a reliable estimate. Using 15x (not 10x) to accommodate
  // Brave Search fallback data which is inherently noisier than direct eBay scraping.
  if (spreadRatio > 15) {
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
