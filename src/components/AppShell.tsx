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

  const isBare = BARE_PAGES.includes(pathname)

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
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
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
