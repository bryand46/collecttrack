import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 })
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Brave Search API key' }, { status: 500 })
  }

  const url = new URL('https://api.search.brave.com/res/v1/images/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', '9')
  url.searchParams.set('safesearch', 'strict')

  const res = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json({ error: data?.message ?? 'Search failed' }, { status: res.status })
  }

  const images = (data.results ?? []).map((item: {
    url: string
    thumbnail: { src: string }
    source: string
    title: string
    page_url: string
  }) => ({
    url: item.url,
    thumbnail: item.thumbnail?.src ?? item.url,
    sourceUrl: item.page_url ?? item.source,
    title: item.title,
  }))

  return NextResponse.json({ images })
}
