import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/items — fetch all items
export async function GET() {
  const items = await prisma.item.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

// POST /api/items — create a new item
export async function POST(request: Request) {
  const body = await request.json()

  const item = await prisma.item.create({
    data: {
      name: body.name,
      category: body.category,
      manufacturer: body.manufacturer ?? null,
      description: body.description,
      condition: body.condition ?? 'Good',
      paidPrice: body.paidPrice,
      estimatedValue: body.estimatedValue,
      imageUrl: body.imageUrl,
      notes: body.notes,
    },
  })

  return NextResponse.json(item, { status: 201 })
}