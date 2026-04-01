import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Stripe from 'stripe'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PLANS, type Plan } from '@/lib/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-01-27.acacia',
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { plan } = await request.json() as { plan: Plan }
  const planConfig = PLANS[plan]

  if (!planConfig || plan === 'free') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }
  if (!planConfig.stripePriceId) {
    return NextResponse.json(
      { error: `STRIPE_PRICE_${plan.toUpperCase()} is not set in .env.local` },
      { status: 503 }
    )
  }

  // Get or create Stripe customer
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    })
    customerId = customer.id
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    })
  }

  const origin = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    metadata: { userId: user.id, plan },
    subscription_data: {
      metadata: { userId: user.id, plan },
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
