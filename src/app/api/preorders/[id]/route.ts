import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const preorder = await prisma.preorder.findFirst({ where: { id, userId: session.user.id } })
  if (!preorder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(preorder)
}

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const existing = await prisma.preorder.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const preorder = await prisma.preorder.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      category: body.category ?? existing.category,
      manufacturer: body.manufacturer ?? null,
      edition: body.edition ?? null,
      imageUrl: body.imageUrl ?? null,
      retailer: body.retailer ?? null,
      orderReference: body.orderReference ?? null,
      totalPrice: body.totalPrice ? Number(body.totalPrice) : null,
      depositPaid: body.depositPaid ? Number(body.depositPaid) : null,
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
      status: body.status ?? existing.status,
      notes: body.notes ?? null,
      convertedItemId: body.convertedItemId ?? existing.convertedItemId,
    },
  })
  return NextResponse.json(preorder)
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.preorder.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.preorder.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
