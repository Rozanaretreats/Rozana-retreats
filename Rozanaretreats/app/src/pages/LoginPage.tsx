import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Leaf, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { homePathForUser } from '../lib/homeRoute'
import { demoUsers } from '../data/mockData'

const demoAccounts = [
  {
    name: 'Ruheed',
    role: 'Owner',
    email: 'ruheed@rozana.com',
    password: 'ruheed',
    detail: 'Both properties · Reports',
  },
  {
    name: 'Firoz',
    role: 'Operations manager',
    email: 'firoz@rozana.com',
    password: 'firoz',
    detail: 'Ooty Skyview · Attendance, Leave, HK',
  },
] as const

const inputClass =
  'w-full rounded-xl border border-sand-dark/80 bg-white px-4 py-3.5 text-[15px] text-forest shadow-[inset_0_1px_2px_rgba(8,28,21,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-forest/30 focus:border-forest/40 focus:shadow-[0_0_0_3px_rgba(27,67,50,0.08)]'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={homePathForUser(user)} replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const ok = await login(email, password)
      if (ok) {
        const demo = demoUsers.find((d) => d.email.toLowerCase() === email.toLowerCase())
        if (demo) {
          navigate(homePathForUser(demo.user as import('../types').User))
          return
        }
        navigate('/my-tasks')
        return
      }
      setError(
        'Invalid email or password. HK staff — ask your operations manager to reset your password under Housekeeping → Team.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const fillDemo = (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email)
    setPassword(account.password)
    setError('')
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(27,67,50,0.22),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_100%_100%,rgba(212,163,115,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#f3efe8_0%,#f8f6f3_45%,#f8f6f3_100%)]" />
        <div className="absolute left-1/2 top-0 h-px w-[min(720px,90vw)] -translate-x-1/2 bg-gradient-to-r from-transparent via-amber/40 to-transparent" />
      </div>

      <div className="relative w-full max-w-[420px]">
        <header className="mb-10 text-center">
          <div className="relative mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center">
            <div className="absolute inset-0 rounded-[22px] bg-forest/10 blur-xl" />
            <div className="relative flex h-full w-full items-center justify-center rounded-[22px] bg-gradient-to-br from-forest to-forest-light shadow-[0_12px_40px_rgba(27,67,50,0.35)] ring-1 ring-white/20">
              <Leaf className="h-8 w-8 text-amber" strokeWidth={1.8} />
            </div>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-forest/45">
            Rozana Retreats
          </p>
          <h1
            className="mt-2 text-[2.35rem] font-semibold leading-none tracking-tight text-forest"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Rozana Ops
          </h1>
          <p className="mt-3 text-sm text-forest/55">Owner visibility · Skyview &amp; Beachview</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-[20px] border border-white/80 bg-white/90 p-8 shadow-[0_24px_64px_rgba(8,28,21,0.08),0_1px_0_rgba(255,255,255,0.9)_inset] backdrop-blur-sm"
        >
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-forest">Sign in</h2>
              <p className="mt-0.5 text-sm text-forest/50">Owner · operations manager · HK staff</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sand text-forest/35">
              <Lock className="h-4 w-4" strokeWidth={2} />
            </div>
          </div>

          {error && (
            <p className="mb-5 rounded-xl border border-red-100 bg-red-50/90 px-4 py-2.5 text-sm text-red-800">
              {error}
            </p>
          )}

          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-forest/45">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@rozana.com"
              autoComplete="username"
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-forest/45">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          <p className="mb-7 text-xs leading-relaxed text-forest/50">
            <span className="font-medium text-forest/65">HK staff forgot password?</span> Ask your
            operations manager — they reset it under Housekeeping → Team → Reset password.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-b from-forest to-forest-dark py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(27,67,50,0.28)] ring-1 ring-forest-light/30 transition-[transform,box-shadow] hover:shadow-[0_12px_32px_rgba(27,67,50,0.34)] active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>

        <div className="mt-8 hidden sm:block">
          <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-forest/40">
            Demo access
          </p>
          <div className="grid gap-2.5">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account)}
                className="group w-full rounded-2xl border border-forest/8 bg-white/70 px-4 py-3.5 text-left shadow-sm transition-[border-color,box-shadow,background] hover:border-forest/15 hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-forest">{account.name}</p>
                    <p className="text-xs text-amber-dark">{account.role}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-sand px-2.5 py-1 text-[10px] font-medium text-forest/50 opacity-0 transition-opacity group-hover:opacity-100">
                    Use account
                  </span>
                </div>
                <p className="mt-2 font-mono text-[11px] text-forest/45">{account.email}</p>
                <p className="mt-1 text-xs text-forest/50">{account.detail}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
