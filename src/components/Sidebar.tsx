'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { getPlan } from '@/lib/plans'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: '/items',
    label: 'My Items',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    href: '/preorders',
    label: 'Preorders',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    href: '/pricing',
    label: 'Plans & Billing',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
]

const PLAN_BADGE: Record<string, { label: string; style: React.CSSProperties }> = {
  free: {
    label: 'Free',
    style: { background: 'rgba(100,116,139,0.2)', color: '#94A3B8' },
  },
  collector: {
    label: 'Collector',
    style: { background: 'rgba(59,130,246,0.2)', color: '#93C5FD' },
  },
  vault: {
    label: 'Vault',
    style: { background: 'rgba(245,158,11,0.2)', color: '#FCD34D' },
  },
}

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User'
  const userEmail = session?.user?.email || ''
  const isAdmin = (session?.user as { role?: string })?.role === 'admin'
  const userPlan = (session?.user as { plan?: string })?.plan ?? 'free'
  const planConfig = getPlan(userPlan)
  const badge = PLAN_BADGE[userPlan] ?? PLAN_BADGE.free

  return (
    <aside
      className="w-60 flex flex-col"
      style={{ background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)', minHeight: '100vh' }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
            aria-hidden="true"
          >
            CT
          </div>
          <span className="text-white font-bold text-lg tracking-tight">CollectTrack</span>
        </div>
      </div>

      {/* Logged-in user + plan badge */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff' }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: '#E2E8F0' }}>
              {userName}
              {isAdmin && (
                <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(234,179,8,0.2)', color: '#FCD34D' }}>
                  Admin
                </span>
              )}
            </p>
            <p className="text-xs truncate" style={{ color: '#475569' }}>{userEmail}</p>
          </div>
        </div>

        {/* Plan badge */}
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={badge.style}>
            {badge.label} plan
          </span>
          {userPlan === 'free' && (
            <Link href="/pricing" className="text-xs font-semibold" style={{ color: '#F59E0B' }}>
              Upgrade →
            </Link>
          )}
          {userPlan !== 'free' && (
            <span className="text-xs" style={{ color: '#334155' }}>
              {planConfig.itemLimit === -1 ? '∞ items' : `${planConfig.itemLimit} item limit`}
            </span>
          )}
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all"
              style={isActive ? { background: 'rgba(59,130,246,0.2)', color: '#93C5FD' } : { color: '#94A3B8' }}
              aria-current={isActive ? 'page' : undefined}
            >
              <span style={{ color: isActive ? '#60A5FA' : '#64748B' }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}

        {/* Add Item button */}
        <div className="mt-4 px-1">
          <Link
            href="/items/new"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFFFFF' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Item
          </Link>
        </div>

        {/* Upgrade CTA for free users */}
        {userPlan === 'free' && (
          <div className="mt-3 px-1">
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Upgrade Plan
            </Link>
          </div>
        )}
      </nav>

      {/* Sign Out */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ color: '#64748B' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#64748B' }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
