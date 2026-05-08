import { FormEvent, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import type { AuthenticatedUser } from '../../shared/types'

interface LoginProps {
  onLogin: (user: AuthenticatedUser) => void
}

export function Login({ onLogin }: LoginProps): JSX.Element {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitLogin = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const result = await window.experianPulse.login(username, password)
      if (result.success && result.user) {
        onLogin(result.user)
        return
      }

      setError(result.message ?? 'Unable to sign in with those credentials.')
    } catch {
      setError('Local authentication is not available. Please restart Experian Pulse and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl grid-cols-[1.05fr_0.95fr] gap-6 pt-10">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-experian-purple text-white">
          <LockKeyhole size={25} />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-experian-magenta">Secure local access</p>
        <h3 className="mt-3 text-3xl font-bold">Welcome to Experian Pulse</h3>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-experian-slate">
          Sign in with a local SQLite-backed user account to open the modules and assigned work queues for your role.
        </p>

        <form className="mt-8 space-y-4" onSubmit={submitLogin}>
          <label className="block text-sm font-semibold text-experian-slate">
            Username
            <input
              autoComplete="username"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin, recruiter, or sourcer"
              value={username}
            />
          </label>
          <label className="block text-sm font-semibold text-experian-slate">
            Password
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              type="password"
              value={password}
            />
          </label>
          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <button
            className="w-full rounded-2xl bg-experian-purple px-5 py-3 font-bold text-white shadow-lg shadow-purple-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Signing in…' : 'Continue to workspace'}
          </button>
        </form>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-experian-purple via-experian-magenta to-experian-blue p-8 text-white shadow-enterprise">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/70">Default local users</p>
        <h3 className="mt-4 text-3xl font-bold">Role-based workspaces are ready.</h3>
        <div className="mt-6 space-y-3 text-sm leading-6 text-white/85">
          <p><span className="font-bold text-white">admin / admin123</span> — Admin access to every module.</p>
          <p><span className="font-bold text-white">recruiter / recruiter123</span> — Assigned requirements and candidates.</p>
          <p><span className="font-bold text-white">sourcer / sourcer123</span> — Requirement folders and candidate entry screens.</p>
        </div>
      </div>
    </section>
  )
}
