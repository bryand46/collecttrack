import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import type { Plan } from '@/lib/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-01-27.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan as Plan | undefined
        if (userId && plan) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan,
              stripeSubscriptionId: session.subscription as string,
              planExpiresAt: null,
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        const plan = sub.metadata?.plan as Plan | undefined
        if (userId && plan) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: sub.status === 'active' ? plan : 'free',
              stripeSubscriptionId: sub.id,
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: 'free',
              stripeSubscriptionId: null,
              planExpiresAt: new Date(sub.current_period_end * 1000),
            },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        if (customerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { plan: 'free' },
          })
        }
        break
      }

      default:
        // Ignore unhandled events
        break
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
