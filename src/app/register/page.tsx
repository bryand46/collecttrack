'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Registration failed.')
      setLoading(false)
      return
    }

    // Auto sign-in after successful registration
    const result = await signIn('credentials', {
      email: email.toLowerCase().trim(),
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Account created but sign-in failed. Please log in manually.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)' }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
        >
          CT
        </div>
        <span className="text-white font-bold text-xl tracking-tight">CollectTrack</span>
      </Link>

      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
        }}
      >
        <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
        <p className="text-sm mb-7" style={{ color: '#94A3B8' }}>
          Start tracking your collection for free
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#CBD5E1' }}>
              Name <span style={{ color: '#64748B', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bryan"
              className="w-full rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#F1F5F9',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#CBD5E1' }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#F1F5F9',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#CBD5E1' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#F1F5F9',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#CBD5E1' }}>
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#F1F5F9',
              }}
            />
          </div>

          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all mt-1 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', boxShadow: '0 4px 16px rgba(59,130,246,0.4)' }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: '#64748B' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold" style={{ color: '#60A5FA' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
