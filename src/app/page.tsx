import Link from 'next/link'
import { PLANS } from '@/lib/plans'
import { CheckIcon } from '@heroicons/react/24/solid'
import { ShieldCheckIcon, StarIcon } from '@heroicons/react/24/outline'

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    color: '#3B82F6',
    bg: '#EFF6FF',
    title: 'Track Everything',
    desc: 'Log every item in your collection — toys, guitars, watches, art, and more — with photos, purchase price, and current value.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    color: '#16A34A',
    bg: '#F0FDF4',
    title: 'Know Your Value',
    desc: 'See your total paid vs. estimated value at a glance. Spot gains and losses across your entire collection instantly.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <rect x="2" y="2" width="4" height="4" rx="1" />
        <rect x="18" y="2" width="4" height="4" rx="1" />
        <rect x="2" y="18" width="4" height="4" rx="1" />
        <rect x="18" y="18" width="4" height="4" rx="1" />
      </svg>
    ),
    color: '#7C3AED',
    bg: '#F5F3FF',
    title: 'Image Search Built In',
    desc: 'Find the perfect photo for any item with integrated image search. Save it directly to your collection in one click.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
    color: '#EA580C',
    bg: '#FFF7ED',
    title: 'Personalized for You',
    desc: "Tell us what you collect and we'll surface your categories first — no digging through options that don't apply to you.",
  },
]

const categories = [
  { emoji: '🎮', label: 'Video Games' },
  { emoji: '🎸', label: 'Guitars' },
  { emoji: '🧸', label: 'Toys & Figures' },
  { emoji: '⌚', label: 'Watches' },
  { emoji: '🎨', label: 'Art' },
  { emoji: '👟', label: 'Sneakers' },
  { emoji: '📚', label: 'Books & Comics' },
  { emoji: '🍷', label: 'Wine & Spirits' },
  { emoji: '🪙', label: 'Coins & Currency' },
  { emoji: '🏆', label: 'Sports Cards' },
  { emoji: '🎬', label: 'Movies & Music' },
  { emoji: '🔩', label: 'Tools & Vintage' },
]

const ORDERED_PLANS = [PLANS.free, PLANS.collector, PLANS.vault]

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)' }}
    >
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
          >
            CT
          </div>
          <span className="text-white font-bold text-lg tracking-tight">CollectTrack</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ color: '#94A3B8' }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
            }}
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-4xl mx-auto w-full">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ background: 'rgba(59,130,246,0.15)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.3)' }}
        >
          ✦ Your personal collection manager
        </div>
        <h1 className="text-5xl font-extrabold leading-tight mb-5" style={{ color: '#F8FAFC' }}>
          Every collectible,{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #60A5FA, #818CF8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            tracked & valued.
          </span>
        </h1>
        <p className="text-lg mb-10 max-w-xl leading-relaxed" style={{ color: '#94A3B8' }}>
          CollectTrack is the simple way to catalog what you own, what you paid, and what it's worth — for collectors of anything.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/register"
            className="px-7 py-3.5 rounded-xl text-base font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
              color: '#FFFFFF',
              boxShadow: '0 4px 20px rgba(59,130,246,0.45)',
            }}
          >
            Start Tracking Free →
          </Link>
          <Link
            href="/login"
            className="px-7 py-3.5 rounded-xl text-base font-semibold transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#CBD5E1',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            Sign In
          </Link>
        </div>

        {/* Category pills */}
        <div className="mt-14 flex flex-wrap justify-center gap-2 max-w-2xl">
          {categories.map((c) => (
            <span
              key={c.label}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#94A3B8',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {c.emoji} {c.label}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: f.bg, color: f.color }}
              >
                {f.icon}
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: '#F1F5F9' }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-6 pb-24 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full mb-4"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.2)' }}>
            <StarIcon className="w-4 h-4" />
            Simple, transparent pricing
          </div>
          <h2 className="text-3xl font-bold mb-3" style={{ color: '#F1F5F9' }}>
            Pick the plan that fits your collection
          </h2>
          <p className="text-sm max-w-md mx-auto" style={{ color: '#64748B' }}>
            Start free — no credit card required. Upgrade anytime as your collection grows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ORDERED_PLANS.map((plan) => {
            const isVault = plan.id === 'vault'
            return (
              <div
                key={plan.id}
                className="relative flex flex-col rounded-2xl p-8"
                style={
                  isVault
                    ? {
                        background: 'linear-gradient(180deg, rgba(245,158,11,0.08) 0%, rgba(15,23,42,0.6) 100%)',
                        border: '1px solid rgba(245,158,11,0.35)',
                        boxShadow: '0 8px 32px rgba(245,158,11,0.1)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }
                }
              >
                {isVault && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className="text-white text-xs font-bold px-4 py-1 rounded-full"
                      style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)' }}
                    >
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r ${plan.color} text-white mb-3`}
                  >
                    <ShieldCheckIcon className="w-3.5 h-3.5" />
                    {plan.name}
                  </div>
                  <div className="flex items-end gap-1.5">
                    <span className="text-4xl font-extrabold" style={{ color: '#F1F5F9' }}>
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="mb-1" style={{ color: '#64748B' }}>/month</span>
                    )}
                  </div>
                </div>

                {/* Features list */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: '#94A3B8' }}>
                      <CheckIcon
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                        style={{ color: isVault ? '#F59E0B' : '#3B82F6' }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href="/register"
                  className="block text-center py-3 rounded-xl font-semibold text-sm transition-all"
                  style={
                    isVault
                      ? {
                          background: 'linear-gradient(135deg, #F59E0B, #EA580C)',
                          color: '#FFFFFF',
                          boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
                        }
                      : plan.id === 'collector'
                      ? { background: '#2563EB', color: '#FFFFFF' }
                      : {
                          background: 'rgba(255,255,255,0.06)',
                          color: '#CBD5E1',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }
                  }
                >
                  {plan.price === 0 ? 'Get Started Free' : `Start with ${plan.name}`}
                </Link>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs mt-8" style={{ color: '#334155' }}>
          Cancel anytime. Payments processed securely by Stripe.
        </p>
      </section>

      {/* CTA strip */}
      <section className="px-6 pb-16 max-w-6xl mx-auto w-full">
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))',
            border: '1px solid rgba(99,102,241,0.25)',
          }}
        >
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#F1F5F9' }}>
            Ready to organize your collection?
          </h2>
          <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>
            Set up takes two minutes. Tell us what you collect and start adding items right away.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-3 rounded-xl text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
              color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
            }}
          >
            Get Started for Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pb-8">
        <p className="text-xs" style={{ color: '#334155' }}>
          CollectTrack — built for collectors, by collectors.
        </p>
      </footer>
    </div>
  )
}
