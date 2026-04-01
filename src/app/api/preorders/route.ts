import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const preorders = await prisma.preorder.findMany({
    where: { userId: session.user.id },
    orderBy: [{ status: 'asc' }, { expectedDate: 'asc' }],
  })
  return NextResponse.json(preorders)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const preorder = await prisma.preorder.create({
    data: {
      name: body.name,
      category: body.category,
      manufacturer: body.manufacturer ?? null,
      edition: body.edition ?? null,
      imageUrl: body.imageUrl ?? null,
      retailer: body.retailer ?? null,
      orderReference: body.orderReference ?? null,
      totalPrice: body.totalPrice ? Number(body.totalPrice) : null,
      depositPaid: body.depositPaid ? Number(body.depositPaid) : null,
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
      status: body.status ?? 'preordered',
      notes: body.notes ?? null,
      userId: session.user.id,
    },
  })

  return NextResponse.json(preorder, { status: 201 })
}
