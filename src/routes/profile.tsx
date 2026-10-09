import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { BottomNav } from '#/components/bottom-nav'
import { PushToggle } from '#/components/push-toggle'
import { WeightChart } from '#/components/weight-chart'
import { currentUser, currentUserId, isLoggedIn, pb, users, type Weight, weights } from '#/lib/pb'
import { formatDate, fromLocalInput, toLocalInput } from '#/lib/time'

const WINDOW_OPTIONS = [0, 4, 6, 8, 10, 12]

export const Route = createFileRoute('/profile')({
  beforeLoad: () => {
    if (!isLoggedIn()) throw redirect({ to: '/login' })
  },
  component: Profile,
})

function Profile() {
  const navigate = useNavigate()

  function logout() {
    pb.authStore.clear()
    navigate({ to: '/login' })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">{currentUser()?.email}</p>
      </header>

      <EatingWindowSection />

      <section className="rounded-2xl border border-input p-4">
        <PushToggle />
      </section>

      <WeightSection />

      <button
        type="button"
        onClick={logout}
        className="rounded-full border border-input px-6 py-3 font-bold text-red-400"
      >
        Cerrar sesión
      </button>

      <BottomNav />
    </main>
  )
}

function EatingWindowSection() {
  const [hours, setHours] = useState(currentUser()?.eatingWindowHours ?? 0)
  const [error, setError] = useState<string | null>(null)

  async function choose(h: number) {
    const prev = hours
    setHours(h)
    setError(null)
    try {
      await users().update(currentUserId(), { eatingWindowHours: h })
    } catch (err) {
      setHours(prev)
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-input p-4">
      <div>
        <h2 className="font-display text-lg font-extrabold">Ventana de comida</h2>
        <p className="text-sm text-muted-foreground">
          Te avisaremos para empezar el siguiente ayuno cuando termine.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {WINDOW_OPTIONS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => choose(h)}
            className={`rounded-full border px-4 py-1.5 text-sm font-bold ${
              h === hours ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
            }`}
          >
            {h === 0 ? 'Sin aviso' : `${h}h`}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  )
}

function useWeights() {
  const [items, setItems] = useState<Weight[]>([])

  useEffect(() => {
    const load = () =>
      weights()
        .getFullList({ sort: 'measuredAt', requestKey: null })
        .then(setItems)
        .catch(() => setItems([]))

    load()
    const unsubscribe = weights().subscribe('*', load)
    return () => {
      unsubscribe.then((fn) => fn())
    }
  }, [])

  return items
}

function WeightSection() {
  const items = useWeights()
  const [kg, setKg] = useState('')
  const [measuredAt, setMeasuredAt] = useState(() => toLocalInput(Date.now()))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const latest = items[items.length - 1]
  const first = items[0]
  const delta = latest && first && items.length > 1 ? latest.kg - first.kg : null

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(kg.replace(',', '.'))
    if (!(value >= 20 && value <= 400)) return setError('Introduce un peso válido.')
    setBusy(true)
    setError(null)
    try {
      await weights().create({
        user: currentUserId(),
        kg: Math.round(value * 10) / 10,
        measuredAt: fromLocalInput(measuredAt),
      })
      setKg('')
      setMeasuredAt(toLocalInput(Date.now()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setBusy(false)
    }
  }

  async function remove(w: Weight) {
    if (confirm(`¿Borrar ${w.kg} kg del ${formatDate(w.measuredAt)}?`)) await weights().delete(w.id)
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-input p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-extrabold">Peso</h2>
        {latest && (
          <span className="font-display text-2xl font-extrabold tabular-nums">
            {latest.kg} kg
            {delta !== null && (
              <span className="ml-2 text-sm font-bold text-muted-foreground">
                {delta > 0 ? '+' : ''}
                {delta.toFixed(1)}
              </span>
            )}
          </span>
        )}
      </div>

      <WeightChart entries={items} />

      <form onSubmit={add} className="flex flex-col gap-2">
        <input
          type="datetime-local"
          value={measuredAt}
          max={toLocalInput(Date.now())}
          onChange={(e) => setMeasuredAt(e.target.value)}
          aria-label="Fecha"
          className="rounded-xl border border-input bg-transparent px-3 py-2.5 text-base"
        />
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Peso en kg"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            aria-label="Peso en kg"
            className="min-w-0 flex-1 rounded-xl border border-input bg-transparent px-3 py-2.5 text-base"
          />
          <button
            type="submit"
            disabled={busy || !kg}
            className="rounded-full bg-primary px-5 font-bold text-primary-foreground disabled:opacity-50"
          >
            Añadir
          </button>
        </div>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {items.length > 0 && (
        <ul className="flex flex-col divide-y divide-input">
          {[...items]
            .reverse()
            .slice(0, 5)
            .map((w) => (
              <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">{formatDate(w.measuredAt)}</span>
                <span className="flex items-center gap-3">
                  <span className="font-bold tabular-nums">{w.kg} kg</span>
                  <button
                    type="button"
                    onClick={() => remove(w)}
                    aria-label="Borrar"
                    className="text-muted-foreground"
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
        </ul>
      )}
    </section>
  )
}
