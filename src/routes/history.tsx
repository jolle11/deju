import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { BottomNav } from '#/components/bottom-nav'
import { FastDialog, RATINGS } from '#/components/fast-dialog'
import { MonthCalendar, WeeklyChart } from '#/components/stats'
import { type Fast, fasts, isLoggedIn } from '#/lib/pb'
import { computeStats, durationMs, isCompleted } from '#/lib/stats'
import { formatDate, formatHours } from '#/lib/time'

export const Route = createFileRoute('/history')({
  beforeLoad: () => {
    if (!isLoggedIn()) throw redirect({ to: '/login' })
  },
  component: History,
})

function usePastFasts() {
  const [items, setItems] = useState<Fast[] | null>(null)

  useEffect(() => {
    const load = () =>
      fasts()
        .getFullList({ filter: 'endedAt != ""', sort: '-startedAt', requestKey: null })
        .then(setItems)
        .catch(() => setItems([]))

    load()
    const unsubscribe = fasts().subscribe('*', load)
    return () => {
      unsubscribe.then((fn) => fn())
    }
  }, [])

  return items
}

function History() {
  const items = usePastFasts()
  const [editing, setEditing] = useState<Fast | null>(null)

  if (!items) return null

  const stats = computeStats(items)

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="flex w-full items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Historial</h1>
      </header>

      {items.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          Aún no has terminado ningún ayuno.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Racha" value={`${stats.streak}d`} />
            <Stat label="Mejor racha" value={`${stats.bestStreak}d`} />
            <Stat label="Cumplidos" value={`${stats.completed}/${stats.total}`} />
            <Stat label="Media" value={formatTileHours(stats.averageMs)} />
            <Stat label="Más largo" value={formatTileHours(stats.longestMs)} />
            <Stat label="Total" value={`${Math.round(stats.totalMs / 3_600_000)}h`} />
          </dl>

          <WeeklyChart hoursByDay={stats.hoursByDay} />
          <MonthCalendar completedDays={stats.completedDays} />

          <h2 className="font-display text-xl font-extrabold">Ayunos</h2>

          <ul className="flex flex-col gap-2">
            {items.map((f) => {
              const ms = durationMs(f)
              const done = isCompleted(f)
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(f)}
                    className="flex w-full items-center gap-4 rounded-2xl border border-input px-4 py-3 text-left"
                  >
                    <span
                      className={`size-3 shrink-0 rounded-full ${done ? 'bg-[var(--lagoon)]' : 'bg-muted'}`}
                    >
                      <span className="sr-only">
                        {done ? 'Objetivo cumplido' : 'Objetivo no cumplido'}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-semibold capitalize text-muted-foreground">
                        {formatDate(f.startedAt)}
                        {f.rating > 0 && ` · ${RATINGS[f.rating - 1]}`}
                      </span>
                      {f.note && <span className="truncate text-sm">{f.note}</span>}
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="font-display text-xl font-extrabold tabular-nums">
                        {formatHours(ms)}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        de {f.targetHours}h
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <BottomNav />

      {editing && (
        <FastDialog
          fast={editing}
          mode="edit-past"
          onClose={() => setEditing(null)}
          onSave={(patch) => fasts().update(editing.id, patch)}
          onDelete={() => fasts().delete(editing.id)}
        />
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse rounded-2xl border border-input px-2 py-3">
      <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-display text-2xl font-extrabold tabular-nums">{value}</dd>
    </div>
  )
}

function formatTileHours(ms: number) {
  return `${(ms / 3_600_000).toFixed(1).replace('.0', '')}h`
}
