import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Admin endpoint to set any user's plan.
 * Protected by ADMIN_SECRET env variable.
 *
 * Usage:
 *   GET /api/admin/set-plan?secret=YOUR_SECRET&email=you@example.com&plan=admin
 *
 * Plans: free | collector | vault | admin
 */
export async function GET(request: Request) {
  const sp     = new URL(request.url).searchParams
  const secret = sp.get('secret') || ''
  const email  = sp.get('email') || ''
  const plan   = sp.get('plan') || 'admin'

  // Must match ADMIN_SECRET env var — never expose this
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret || secret !== adminSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!email) {
    return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 })
  }

  const validPlans = ['free', 'collector', 'vault', 'admin']
  if (!validPlans.includes(plan)) {
    return NextResponse.json({ error: `Invalid plan. Use: ${validPlans.join(', ')}` }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 })
  }

  await prisma.user.update({
    where: { email },
    data: {
      plan,
      marketLookupCount: 0,    // reset the counter too
      marketLookupResetAt: new Date(),
    },
  })

  return NextResponse.json({
    success: true,
    message: `${email} has been upgraded to "${plan}" plan with lookup counter reset.`,
    user: { email, plan },
  })
}
