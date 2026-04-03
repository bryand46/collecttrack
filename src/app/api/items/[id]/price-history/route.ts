import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — fetch all price history for an item
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify the item belongs to this user
  const item = await prisma.item.findFirst({ where: { id, userId: session.user.id } })
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  const history = await prisma.priceHistory.findMany({
    where: { itemId: id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(history)
}

// POST — save a manual price entry
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const price = Number(body.price)

  if (!price || price <= 0) return NextResponse.json({ error: 'Invalid price' }, { status: 400 })

  const item = await prisma.item.findFirst({ where: { id, userId: session.user.id } })
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  const entry = await prisma.priceHistory.create({
    data: { itemId: id, price, source: body.source ?? 'manual' },
  })

  return NextResponse.json(entry)
}
