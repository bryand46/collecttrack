import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/profile — fetch the collector profile (single global profile until auth)
export async function GET() {
  const profile = await prisma.collectorProfile.findFirst()
  return NextResponse.json(profile ?? null)
}

// POST /api/profile — create profile (onboarding)
export async function POST(request: Request) {
  const body = await request.json()
  const existing = await prisma.collectorProfile.findFirst()

  if (existing) {
    // Update instead of duplicate
    const updated = await prisma.collectorProfile.update({
      where: { id: existing.id },
      data: {
        preferredGroups: JSON.stringify(body.preferredGroups ?? []),
        displayName: body.displayName ?? null,
      },
    })
    return NextResponse.json(updated)
  }

  const profile = await prisma.collectorProfile.create({
    data: {
      preferredGroups: JSON.stringify(body.preferredGroups ?? []),
      displayName: body.displayName ?? null,
    },
  })
  return NextResponse.json(profile, { status: 201 })
}

// PUT /api/profile — update existing profile
export async function PUT(request: Request) {
  const body = await request.json()
  const existing = await prisma.collectorProfile.findFirst()

  if (!existing) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const updated = await prisma.collectorProfile.update({
    where: { id: existing.id },
    data: {
      preferredGroups: JSON.stringify(body.preferredGroups ?? []),
      displayName: body.displayName ?? existing.displayName,
    },
  })
  return NextResponse.json(updated)
}
