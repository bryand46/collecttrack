import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Debug endpoint — shows exactly what eBay returns to Vercel's servers.
 * Usage: /api/debug-market-value?name=Poison+Ivy+Deadly+Nature&manufacturer=Sideshow+Collectibles
 * Only accessible when logged in.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp           = new URL(request.url).searchParams
  const name         = (sp.get('name') || '').trim()
  const manufacturer = (sp.get('manufacturer') || '').trim()

  if (!name) return NextResponse.json({ error: 'Missing name param' }, { status: 400 })

  const searchQuery = [name, manufacturer].filter(Boolean).join(' ')
  const searchUrl   =
    `https://www.ebay.com/sch/i.html?` +
    `_nkw=${encodeURIComponent(searchQuery)}` +
    `&LH_Sold=1&LH_Complete=1&_sacat=0&_from=R40&rt=nc`

  let htmlSize = 0
  let status   = 0
  let blocked  = false
  let hasCaptcha = false
  let blockCount = 0
  let priceClasses: string[] = []
  let rawPrices: number[] = []
  let sampleBlocks: string[] = []
  let htmlSnippet = ''
  let fetchError  = ''

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.208 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control':   'no-cache',
        'Sec-Fetch-Dest':  'document',
        'Sec-Fetch-Mode':  'navigate',
        'Sec-Fetch-Site':  'none',
      },
      cache: 'no-store',
    })

    status   = res.status
    const html = await res.text()
    htmlSize = html.length

    hasCaptcha = html.includes('g-recaptcha') || html.includes('Robot Check')
    blocked    = hasCaptcha || !html.includes('ebay')

    // Count blocks
    const blockRe = /<li[^>]+class="[^"]*(?:s-item|s-card)[^"]*"[^>]*>/gi
    const splitPoints: number[] = []
    let m: RegExpExecArray | null
    while ((m = blockRe.exec(html)) !== null) splitPoints.push(m.index)
    blockCount = splitPoints.length

    // Find price classes
    const classMatches = html.match(/class="([^"]*price[^"]*)"/gi) ?? []
    priceClasses = [...new Set(classMatches)].slice(0, 8)

    // Full price sweep
    const priceMatches = [...html.matchAll(/>\s*\$\s*([\d,]+(?:\.\d{1,2})?)\s*</g)]
    rawPrices = priceMatches
      .map(pm => parseFloat(pm[1].replace(/,/g, '')))
      .filter(p => p >= 10 && p <= 500_000)
      .slice(0, 30)

    // First 2 block samples (titles + prices)
    for (let i = 0; i < Math.min(3, splitPoints.length); i++) {
      const block = html.slice(splitPoints[i], splitPoints[i] + 1500)
      const titleMatch = block.match(/(?:s-item__title|s-card__title|role="heading")[^>]*>(?:<[^>]+>)?([^<]{5,})/i)
      const priceMatch = block.match(/>\s*\$\s*([\d,]+(?:\.\d{1,2})?)\s*</)
      sampleBlocks.push(JSON.stringify({
        title: titleMatch?.[1]?.trim() ?? '(no title found)',
        price: priceMatch?.[1] ?? '(no price found)',
      }))
    }

    // First 500 chars of HTML for structure diagnosis
    htmlSnippet = html.slice(0, 500).replace(/\s+/g, ' ')

  } catch (e: any) {
    fetchError = e?.message ?? String(e)
  }

  return NextResponse.json({
    searchQuery,
    searchUrl,
    httpStatus:    status,
    htmlSizeKB:    (htmlSize / 1024).toFixed(1),
    blocked,
    hasCaptcha,
    blockCount,
    priceClassesFound: priceClasses,
    rawPricesSweep: rawPrices,
    sampleParsedBlocks: sampleBlocks,
    htmlSnippet,
    fetchError: fetchError || null,
  }, { status: 200 })
}
