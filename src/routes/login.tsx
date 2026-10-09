import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { isLoggedIn, pb } from '#/lib/pb'
import { useI18n } from '#/lib/preferences'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (isLoggedIn()) throw redirect({ to: '/' })
  },
  component: Login,
})

function Login() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signup') {
        await pb.collection('users').create({ email, password, passwordConfirm: password })
      }
      await pb.collection('users').authWithPassword(email, password)
      navigate({ to: '/' })
    } catch {
      setError(mode === 'login' ? t('login.invalid') : t('login.signupError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{t('app.name')}</h1>
        <p className="mt-1 text-muted-foreground">{t('login.tagline')}</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder={t('login.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-input bg-transparent px-3 py-2.5"
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder={t('login.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border border-input bg-transparent px-3 py-2.5"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-primary px-3 py-3 font-extrabold text-primary-foreground disabled:opacity-50"
        >
          {mode === 'login' ? t('login.submit') : t('login.signup')}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className="text-sm text-muted-foreground underline"
      >
        {mode === 'login' ? t('login.toSignup') : t('login.toLogin')}
      </button>
    </main>
  )
}
