import { NextResponse } from 'next/server'

interface EbayItem {
  title: string[]
  sellingStatus: { currentPrice: { __value__: string }[] }[]
  listingInfo: { endTime: string[] }[]
  viewItemURL: string[]
}

interface EbayResponse {
  findCompletedItemsResponse: {
    ack: string[]
    errorMessage?: { error: { message: string[] }[] }[]
    searchResult: {
      '@count': string
      item?: EbayItem[]
    }[]
  }[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
  }

  const appId = process.env.EBAY_APP_ID
  if (!appId) {
    return NextResponse.json(
      { error: 'eBay App ID not configured. Add EBAY_APP_ID to your .env.local file.' },
      { status: 503 }
    )
  }

  const params = new URLSearchParams({
    'OPERATION-NAME': 'findCompletedItems',
    'SECURITY-APPNAME': appId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'keywords': query,
    'itemFilter(0).name': 'SoldItemsOnly',
    'itemFilter(0).value': 'true',
    'sortOrder': 'EndTimeSoonest',
    'paginationInput.entriesPerPage': '20',
  })

  const url = `https://svcs.ebay.com/services/search/FindingService/v1?${params.toString()}`

  let data: EbayResponse
  try {
    const res = await fetch(url, { next: { revalidate: 300 } }) // cache 5 min
    if (!res.ok) {
      throw new Error(`eBay API responded with status ${res.status}`)
    }
    data = await res.json()
  } catch (err) {
    console.error('eBay fetch error:', err)
    return NextResponse.json({ error: 'Failed to reach eBay API' }, { status: 502 })
  }

  const root = data?.findCompletedItemsResponse?.[0]
  if (!root || root.ack?.[0] !== 'Success') {
    const msg = root?.errorMessage?.[0]?.error?.[0]?.message?.[0] ?? 'eBay returned an error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const rawItems = root.searchResult?.[0]?.item ?? []
  if (rawItems.length === 0) {
    return NextResponse.json({ error: 'No sold listings found for this item.' }, { status: 404 })
  }

  const listings = rawItems
    .map((item: EbayItem) => {
      const price = parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ?? '0')
      const soldDate = item.listingInfo?.[0]?.endTime?.[0] ?? ''
      return {
        title: item.title?.[0] ?? '',
        price,
        soldDate,
        url: item.viewItemURL?.[0] ?? '',
      }
    })
    .filter((l) => l.price > 0)

  if (listings.length === 0) {
    return NextResponse.json({ error: 'No valid price data found.' }, { status: 404 })
  }

  const prices = listings.map((l) => l.price).sort((a, b) => a - b)
  const sum = prices.reduce((acc, p) => acc + p, 0)
  const average = Math.round((sum / prices.length) * 100) / 100
  const low = prices[0]
  const high = prices[prices.length - 1]
  const mid = Math.floor(prices.length / 2)
  const median =
    prices.length % 2 === 0
      ? Math.round(((prices[mid - 1] + prices[mid]) / 2) * 100) / 100
      : prices[mid]

  return NextResponse.json({
    average,
    median,
    low,
    high,
    count: listings.length,
    listings,
  })
}
