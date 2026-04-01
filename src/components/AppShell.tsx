'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Onboarding from '@/components/Onboarding'

// Pages that render without the sidebar shell
const BARE_PAGES = ['/', '/login', '/register', '/pricing']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [profileChecked, setProfileChecked] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isBare = BARE_PAGES.includes(pathname)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Lock body scroll when sidebar drawer is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  useEffect(() => {
    if (isBare) {
      setProfileChecked(true)
      return
    }
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        setShowOnboarding(data === null)
        setProfileChecked(true)
      })
      .catch(() => setProfileChecked(true))
  }, [isBare])

  // Public pages — no sidebar
  if (isBare) {
    return <>{children}</>
  }

  if (!profileChecked) return null

  return (
    <div className="flex min-h-screen" style={{ background: '#F1F5F9' }}>
      {/* ── Mobile overlay backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar (desktop: always visible, mobile: slide-in drawer) ── */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-40 w-60 transition-transform duration-300 ease-in-out',
          'lg:static lg:translate-x-0 lg:z-auto lg:flex-shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* ── Right side: mobile top bar + page content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar — hidden on desktop */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-20"
          style={{ background: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg"
            style={{ color: '#94A3B8' }}
            aria-label="Open navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
              aria-hidden="true"
            >
              CT
            </div>
            <span className="text-white font-bold text-base tracking-tight">CollectTrack</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>

      {showOnboarding && (
        <Onboarding
          onComplete={() => {
            setShowOnboarding(false)
            router.push('/dashboard')
          }}
        />
      )}
    </div>
  )
}
