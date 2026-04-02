import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withinLookupLimit, needsLookupReset, type Plan } from '@/lib/plans'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query   = searchParams.get('q')    // item name + manufacturer
  const condition = searchParams.get('condition') ?? ''
  const edition   = searchParams.get('edition') ?? ''

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
  }

  // Check / reset monthly lookup quota (shared with eBay counter)
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let { marketLookupCount, marketLookupResetAt } = user
  if (needsLookupReset(marketLookupResetAt)) {
    marketLookupCount = 0
    marketLookupResetAt = new Date()
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

  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Perplexity API key not configured. Add PERPLEXITY_API_KEY to your environment variables.' },
      { status: 503 }
    )
  }

  // Build a focused search prompt
  const itemDescription = [
    condition && `${condition} condition`,
    query,
    edition && `(${edition} edition)`,
  ].filter(Boolean).join(' ')

  const prompt = `What is the current resale / market value of a ${itemDescription}?

Search recent sold listings across eBay, StockX, Amazon, collector marketplaces, and any specialist sites for this type of item. Focus on sold (completed) sales from the past 6 months.

Respond ONLY with a valid JSON object — no markdown, no explanation outside the JSON — in this exact format:
{
  "average": <number in USD, no currency symbol>,
  "low": <lowest recent sale price as number>,
  "high": <highest recent sale price as number>,
  "confidence": "<high|medium|low>",
  "sources": ["<site name>", "<site name>"],
  "summary": "<1-2 sentence plain-English explanation of the price range and what drives value>"
}`

  let perplexityData: any
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a collectibles price research assistant. You always respond with valid JSON only, no markdown fences or extra text.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 400,
        temperature: 0.2,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Perplexity error:', errText)
      return NextResponse.json({ error: 'AI price lookup failed. Try again shortly.' }, { status: 502 })
    }

    perplexityData = await res.json()
  } catch (err) {
    console.error('Perplexity fetch error:', err)
    return NextResponse.json({ error: 'Could not reach AI pricing service.' }, { status: 502 })
  }

  // Parse the JSON from Perplexity's message content
  let parsed: any
  try {
    const content: string = perplexityData.choices?.[0]?.message?.content ?? ''
    // Strip any accidental markdown fences
    const clean = content.replace(/```json?/gi, '').replace(/```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    console.error('Failed to parse Perplexity response:', perplexityData)
    return NextResponse.json({ error: 'Could not parse AI response. Try again.' }, { status: 502 })
  }

  const average = Number(parsed.average)
  const low     = Number(parsed.low)
  const high    = Number(parsed.high)

  if (!average || isNaN(average)) {
    return NextResponse.json({ error: 'No pricing data found for this item.' }, { status: 404 })
  }

  // Increment lookup count
  await prisma.user.update({
    where: { id: user.id },
    data: { marketLookupCount: { increment: 1 } },
  })

  return NextResponse.json({
    average: Math.round(average),
    low: Math.round(low || average * 0.8),
    high: Math.round(high || average * 1.2),
    confidence: parsed.confidence ?? 'medium',
    sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    summary: parsed.summary ?? '',
  })
}
