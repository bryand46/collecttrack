export type Plan = 'free' | 'collector' | 'vault' | 'admin'

export interface PlanConfig {
  id: Plan
  name: string
  price: number          // USD per month
  stripePriceId: string  // set via env
  color: string          // tailwind gradient classes for badge
  itemLimit: number      // -1 = unlimited
  imageLimit: number     // images per item; -1 = unlimited
  marketLookupLimit: number // per month; -1 = unlimited
  analytics: boolean
  csvExport: boolean
  features: string[]
}

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    stripePriceId: '',
    color: 'from-slate-500 to-slate-600',
    itemLimit: 25,
    imageLimit: 0,
    marketLookupLimit: 5,
    analytics: false,
    csvExport: false,
    features: [
      'Up to 25 items',
      '5 eBay market lookups / month',
      'Core item tracking',
      'Condition & edition tagging',
    ],
  },
  collector: {
    id: 'collector',
    name: 'Collector',
    price: 5,
    stripePriceId: process.env.STRIPE_PRICE_COLLECTOR ?? '',
    color: 'from-blue-500 to-indigo-600',
    itemLimit: 250,
    imageLimit: 3,
    marketLookupLimit: 50,
    analytics: true,
    csvExport: false,
    features: [
      'Up to 250 items',
      '3 images per item',
      '50 eBay market lookups / month',
      'Collection analytics & value tracking',
      'Category breakdown charts',
    ],
  },
  vault: {
    id: 'vault',
    name: 'Vault',
    price: 12,
    stripePriceId: process.env.STRIPE_PRICE_VAULT ?? '',
    color: 'from-amber-500 to-orange-600',
    itemLimit: -1,
    imageLimit: -1,
    marketLookupLimit: -1,
    analytics: true,
    csvExport: true,
    features: [
      'Unlimited items',
      'Unlimited image uploads',
      'Unlimited eBay market lookups',
      'Full analytics + value history',
      'CSV export',
      'Priority support',
    ],
  },
  admin: {
    id: 'admin',
    name: 'Admin',
    price: 0,
    stripePriceId: '',
    color: 'from-purple-600 to-violet-700',
    itemLimit: -1,
    imageLimit: -1,
    marketLookupLimit: -1,
    analytics: true,
    csvExport: true,
    features: [
      'Unlimited everything',
      'Admin access',
    ],
  },
}

export function getPlan(plan: string): PlanConfig {
  return PLANS[(plan as Plan) in PLANS ? (plan as Plan) : 'free']
}

/** Returns true if the user is within their item limit */
export function withinItemLimit(plan: Plan, currentCount: number): boolean {
  const limit = PLANS[plan]?.itemLimit ?? 25
  return limit === -1 || currentCount < limit
}

/** Returns true if the user has remaining market lookups this month */
export function withinLookupLimit(plan: Plan, currentCount: number): boolean {
  const limit = PLANS[plan]?.marketLookupLimit ?? 5
  return limit === -1 || currentCount < limit
}

/** Returns true if monthly reset is needed (last reset > 30 days ago or never) */
export function needsLookupReset(resetAt: Date | null): boolean {
  if (!resetAt) return true
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  return Date.now() - resetAt.getTime() > thirtyDays
}
