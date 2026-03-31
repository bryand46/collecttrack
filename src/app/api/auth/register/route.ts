import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (existing) {
      return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashed,
        name: name?.trim() || null,
        role: 'user',
      },
    })

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      { status: 201 }
    )
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
