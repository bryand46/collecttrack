import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/items/:id — fetch single item
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const item = await prisma.item.findUnique({
    where: { id },
  })

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  return NextResponse.json(item)
}

// PUT /api/items/:id — update an item
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const item = await prisma.item.update({
    where: { id },
    data: {
      name: body.name,
      category: body.category,
      manufacturer: body.manufacturer ?? null,
      description: body.description,
      condition: body.condition,
      paidPrice: body.paidPrice,
      estimatedValue: body.estimatedValue,
      imageUrl: body.imageUrl,
      notes: body.notes,
    },
  })

  return NextResponse.json(item)
}

// DELETE /api/items/:id — delete an item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  await prisma.item.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
