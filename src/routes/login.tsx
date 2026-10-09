import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { isLoggedIn, pb } from '#/lib/pb'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (isLoggedIn()) throw redirect({ to: '/' })
  },
  component: Login,
})

function Login() {
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
        await pb
          .collection('users')
          .create({ email, password, passwordConfirm: password })
      }
      await pb.collection('users').authWithPassword(email, password)
      navigate({ to: '/' })
    } catch {
      setError(
        mode === 'login'
          ? 'Email o contraseña incorrectos'
          : 'No se pudo crear la cuenta (mínimo 8 caracteres)',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">Deju</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-input bg-transparent px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-input bg-transparent px-3 py-2"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className="text-sm text-muted-foreground underline"
      >
        {mode === 'login' ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}
      </button>
    </main>
  )
}
