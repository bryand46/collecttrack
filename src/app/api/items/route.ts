import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { getPlan, withinItemLimit, type Plan } from '@/lib/plans'

// GET /api/items — fetch items for the current user
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const items = await prisma.item.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

// POST /api/items — create a new item (checks item limit)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check item limit for the user's plan
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const plan = getPlan(user.plan)
  const itemCount = await prisma.item.count({ where: { userId: user.id } })

  if (!withinItemLimit(user.plan as Plan, itemCount)) {
    return NextResponse.json(
      {
        error: `Item limit reached`,
        limit: plan.itemLimit,
        plan: user.plan,
        upgradePath: '/pricing',
      },
      { status: 403 }
    )
  }

  const body = await request.json()

  const item = await prisma.item.create({
    data: {
      name: body.name,
      category: body.category,
      manufacturer: body.manufacturer ?? null,
      edition: body.edition ?? null,
      description: body.description,
      condition: body.condition ?? 'Good',
      paidPrice: body.paidPrice,
      estimatedValue: body.estimatedValue,
      imageUrl: body.imageUrl,
      notes: body.notes,
      userId: user.id,
    },
  })

  return NextResponse.json(item, { status: 201 })
}
