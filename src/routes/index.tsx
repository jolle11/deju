import { useEffect, useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { type Fast, currentUserId, fasts, isLoggedIn, pb } from '#/lib/pb'
import { disablePush, enablePush, getPushSubscription, pushSupported } from '#/lib/push'

const TARGET_OPTIONS = [13, 16, 18, 20, 24, 36]

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (!isLoggedIn()) throw redirect({ to: '/login' })
  },
  component: Home,
})

function useActiveFast() {
  const [fast, setFast] = useState<Fast | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () =>
      fasts()
        .getFirstListItem('endedAt = ""', { sort: '-startedAt', requestKey: null })
        .then(setFast)
        .catch(() => setFast(null))
        .finally(() => setLoading(false))

    load()
    // Keep every open device in sync.
    const unsubscribe = fasts().subscribe('*', load)
    return () => {
      unsubscribe.then((fn) => fn())
    }
  }, [])

  return { fast, loading }
}

function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [enabled])
  return now
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

function Home() {
  const navigate = useNavigate()
  const { fast, loading } = useActiveFast()
  const now = useNow(Boolean(fast))
  const [target, setTarget] = useState(16)

  async function start() {
    await fasts().create({
      user: currentUserId(),
      startedAt: new Date().toISOString(),
      targetHours: target,
    })
  }

  async function stop() {
    if (!fast) return
    await fasts().update(fast.id, { endedAt: new Date().toISOString() })
  }

  function logout() {
    pb.authStore.clear()
    navigate({ to: '/login' })
  }

  if (loading) return null

  const elapsed = fast ? now - new Date(fast.startedAt).getTime() : 0
  const goalMs = fast ? fast.targetHours * 3_600_000 : 0
  const progress = fast ? Math.min(1, elapsed / goalMs) : 0

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-8 p-6">
      <header className="flex w-full items-center justify-between">
        <h1 className="text-2xl font-bold">Deju</h1>
        <button type="button" onClick={logout} className="text-sm text-muted-foreground">
          Salir
        </button>
      </header>

      <ProgressRing progress={progress}>
        {fast ? (
          <>
            <span className="text-sm text-muted-foreground">
              {progress >= 1 ? '¡Objetivo cumplido!' : 'Ayunando'}
            </span>
            <span className="font-mono text-4xl font-bold tabular-nums">
              {formatDuration(elapsed)}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress >= 1
                ? `+${formatDuration(elapsed - goalMs)}`
                : `Quedan ${formatDuration(goalMs - elapsed)}`}
            </span>
          </>
        ) : (
          <span className="text-lg text-muted-foreground">Sin ayuno activo</span>
        )}
      </ProgressRing>

      {fast ? (
        <button
          type="button"
          onClick={stop}
          className="w-full rounded-full bg-destructive px-6 py-3 font-semibold text-white"
        >
          Terminar ayuno
        </button>
      ) : (
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-wrap justify-center gap-2">
            {TARGET_OPTIONS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setTarget(h)}
                className={`rounded-full border px-4 py-1.5 text-sm ${
                  h === target ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={start}
            className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
          >
            Empezar ayuno de {target}h
          </button>
        </div>
      )}

      <PushToggle />
    </main>
  )
}

function ProgressRing({
  progress,
  children,
}: {
  progress: number
  children: React.ReactNode
}) {
  const r = 120
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid size-72 place-items-center">
      <svg viewBox="0 0 280 280" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="140" cy="140" r={r} fill="none" strokeWidth="16" className="stroke-muted" />
        <circle
          cx="140"
          cy="140"
          r={r}
          fill="none"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          className="stroke-[var(--lagoon)] transition-[stroke-dashoffset] duration-1000"
        />
      </svg>
      <div className="relative flex flex-col items-center gap-1">{children}</div>
    </div>
  )
}

function PushToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pushSupported()) return
    getPushSubscription().then((s) => setEnabled(Boolean(s)))
  }, [])

  if (!pushSupported()) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        Para recibir avisos, instala la app en tu pantalla de inicio.
      </p>
    )
  }
  if (enabled === null) return null

  async function toggle() {
    setError(null)
    try {
      if (enabled) await disablePush()
      else await enablePush()
      setEnabled(!enabled)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" onClick={toggle} className="text-sm underline">
        {enabled ? 'Desactivar notificaciones' : 'Activar notificaciones'}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
