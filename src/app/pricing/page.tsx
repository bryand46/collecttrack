'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CheckIcon, StarIcon, ShieldCheckIcon } from '@heroicons/react/24/solid'
import { PLANS } from '@/lib/plans'

const ORDERED_PLANS = [PLANS.free, PLANS.collector, PLANS.vault]

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentPlan = (session?.user as { plan?: string })?.plan ?? 'free'

  async function handleSelect(planId: string) {
    if (planId === 'free') return
    if (!session) {
      router.push('/login?next=/pricing')
      return
    }
    setLoading(planId)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
      setLoading(null)
    }
  }

  async function handleManage() {
    setLoading('portal')
    setError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open portal')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white py-16 px-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mb-14">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
          <StarIcon className="w-4 h-4" />
          Simple, transparent pricing
        </div>
        <h1 className="text-4xl font-bold mb-4">
          Choose your{' '}
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            CollectTrack
          </span>{' '}
          plan
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Start free, upgrade when your collection grows. Every plan includes
          unlimited categories and full edition tracking.
        </p>
      </div>

      {/* Cards */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {ORDERED_PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id
          const isVault = plan.id === 'vault'

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all ${
                isVault
                  ? 'border-amber-500/60 bg-gradient-to-b from-amber-950/40 to-gray-900 shadow-xl shadow-amber-900/20'
                  : 'border-gray-700/60 bg-gray-900'
              }`}
            >
              {isVault && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                    MOST POPULAR
                  </span>
                </div>
              )}

              {/* Plan name + badge */}
              <div className="mb-6">
                <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r ${plan.color} text-white mb-3`}>
                  <ShieldCheckIcon className="w-3.5 h-3.5" />
                  {plan.name}
                </div>
                <div className="flex items-end gap-1.5">
                  <span className="text-4xl font-extrabold">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-400 mb-1">/month</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <CheckIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isVault ? 'text-amber-400' : 'text-blue-400'}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                plan.id === 'free' ? (
                  <div className="text-center text-sm text-gray-500 font-medium py-3">
                    Your current plan
                  </div>
                ) : (
                  <button
                    onClick={handleManage}
                    disabled={loading === 'portal'}
                    className="w-full py-3 rounded-xl font-semibold text-sm border border-gray-600 text-gray-300 hover:bg-gray-800 transition disabled:opacity-50"
                  >
                    {loading === 'portal' ? 'Opening…' : 'Manage billing →'}
                  </button>
                )
              ) : plan.id === 'free' ? (
                <div className="text-center text-sm text-gray-600 font-medium py-3">
                  —
                </div>
              ) : (
                <button
                  onClick={() => handleSelect(plan.id)}
                  disabled={!!loading}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50 ${
                    isVault
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-900/40'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {loading === plan.id ? 'Loading…' : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-md mx-auto mt-8 bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-xl p-4 text-center">
          {error}
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-gray-600 text-sm mt-12">
        Cancel anytime. Payments are processed securely by Stripe.
      </p>
    </div>
  )
}
