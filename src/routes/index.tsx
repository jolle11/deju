import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { BottomNav } from '#/components/bottom-nav'
import { FastDialog } from '#/components/fast-dialog'
import { currentUserId, type Fast, fasts, isLoggedIn, pb } from '#/lib/pb'
import { disablePush, enablePush, getPushSubscription, pushSupported } from '#/lib/push'
import { formatDate, formatDuration } from '#/lib/time'
import { type Zone, zoneAt } from '#/lib/zones'

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

function Home() {
  const navigate = useNavigate()
  const { fast, loading } = useActiveFast()
  const now = useNow(Boolean(fast))
  const [target, setTarget] = useState(16)
  const [custom, setCustom] = useState(false)
  const [dialog, setDialog] = useState<'edit-active' | 'finish' | null>(null)

  async function start() {
    await fasts().create({
      user: currentUserId(),
      startedAt: new Date().toISOString(),
      targetHours: target,
    })
  }

  function logout() {
    pb.authStore.clear()
    navigate({ to: '/login' })
  }

  if (loading) return null

  const elapsed = fast ? now - new Date(fast.startedAt).getTime() : 0
  const goalMs = fast ? fast.targetHours * 3_600_000 : 0
  const progress = fast ? Math.min(1, elapsed / goalMs) : 0
  const { zone, next } = zoneAt(elapsed)

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="flex w-full items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Deju</h1>
        <button
          type="button"
          onClick={logout}
          className="text-sm font-semibold text-muted-foreground"
        >
          Salir
        </button>
      </header>

      <section className="flex w-full flex-1 flex-col items-center justify-center gap-10 py-8">
        <ProgressRing progress={progress} color={fast ? zone.color : undefined}>
          {fast ? (
            <>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {progress >= 1 ? '¡Objetivo cumplido!' : `Ayuno de ${fast.targetHours}h`}
              </span>
              <span className="font-display text-5xl font-extrabold tracking-tight tabular-nums">
                {formatDuration(elapsed)}
              </span>
              <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                {progress >= 1
                  ? `+${formatDuration(elapsed - goalMs)}`
                  : `Quedan ${formatDuration(goalMs - elapsed)}`}
              </span>
            </>
          ) : (
            <>
              <span className="font-display text-6xl font-extrabold tracking-tight">{target}h</span>
              <span className="text-sm font-semibold text-muted-foreground">
                Listo para empezar
              </span>
            </>
          )}
        </ProgressRing>

        {fast ? (
          <div className="flex w-full flex-col items-center gap-4">
            <ZoneCard zone={zone} next={next} elapsed={elapsed} />
            <button
              type="button"
              onClick={() => setDialog('edit-active')}
              className="text-sm font-semibold text-muted-foreground"
            >
              Inicio: {formatDate(fast.startedAt)} · <span className="underline">Editar</span>
            </button>
            <button
              type="button"
              onClick={() => setDialog('finish')}
              className="w-full rounded-full bg-destructive px-6 py-4 text-lg font-extrabold text-white"
            >
              Terminar ayuno
            </button>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-wrap justify-center gap-2">
              {TARGET_OPTIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setTarget(h)
                    setCustom(false)
                  }}
                  className={`rounded-full border px-4 py-1.5 text-sm font-bold ${
                    h === target && !custom
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input'
                  }`}
                >
                  {h}h
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustom(true)}
                className={`rounded-full border px-4 py-1.5 text-sm font-bold ${
                  custom ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                }`}
              >
                Otro
              </button>
            </div>
            {custom && (
              <label className="flex items-center justify-center gap-2 text-sm font-semibold">
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={target}
                  onChange={(e) =>
                    setTarget(Math.min(168, Math.max(1, Number(e.target.value) || 1)))
                  }
                  className="w-24 rounded-xl border border-input bg-transparent px-3 py-2 text-center text-base"
                />
                horas
              </label>
            )}
            <button
              type="button"
              onClick={start}
              className="w-full rounded-full bg-primary px-6 py-4 text-lg font-extrabold text-primary-foreground"
            >
              Empezar ayuno de {target}h
            </button>
          </div>
        )}
      </section>

      <PushToggle />
      <BottomNav />

      {fast && dialog && (
        <FastDialog
          fast={fast}
          mode={dialog}
          onClose={() => setDialog(null)}
          onSave={(patch) => fasts().update(fast.id, patch)}
        />
      )}
    </main>
  )
}

function ZoneCard({ zone, next, elapsed }: { zone: Zone; next?: Zone; elapsed: number }) {
  return (
    <div className="w-full rounded-2xl border border-input px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="size-3 rounded-full" style={{ backgroundColor: zone.color }} />
        <span className="font-display text-lg font-extrabold">{zone.name}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{zone.description}</p>
      {next && (
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground tabular-nums">
          {next.name} en {formatDuration(next.fromHours * 3_600_000 - elapsed)}
        </p>
      )}
    </div>
  )
}

function ProgressRing({
  progress,
  color,
  children,
}: {
  progress: number
  color?: string
  children: React.ReactNode
}) {
  const r = 120
  const c = 2 * Math.PI * r
  return (
    <div className="relative mx-auto grid size-72 place-items-center sm:size-80">
      <svg viewBox="0 0 280 280" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="140" cy="140" r={r} fill="none" strokeWidth="18" className="stroke-muted" />
        <circle
          cx="140"
          cy="140"
          r={r}
          fill="none"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          style={{ stroke: color ?? 'var(--lagoon)' }}
          className="transition-[stroke-dashoffset,stroke] duration-1000"
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
