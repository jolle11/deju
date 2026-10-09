import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AppShell } from '#/components/app-shell'
import { FastDialog, RATINGS } from '#/components/fast-dialog'
import { MonthCalendar, WeeklyChart } from '#/components/stats'
import { WeightSection } from '#/components/weight-section'
import { onCollectionChange } from '#/lib/live'
import { type Fast, fasts, isLoggedIn } from '#/lib/pb'
import { useI18n, usePrefs } from '#/lib/preferences'
import { computeStats, durationMs, isCompleted } from '#/lib/stats'
import { capitalize, formatDate, formatHours } from '#/lib/time'

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
    return onCollectionChange('fasts', load)
  }, [])

  return items
}

function History() {
  const { t, locale } = useI18n()
  const { targetHours } = usePrefs()
  const items = usePastFasts()
  const [editing, setEditing] = useState<Fast | null>(null)

  if (!items) return <AppShell title={t('history.title')}>{null}</AppShell>

  const stats = computeStats(items)

  return (
    <AppShell title={t('history.title')}>
      {items.length === 0 ? (
        <>
          <p className="py-16 text-center text-muted-foreground">{t('history.empty')}</p>
          <WeightSection />
        </>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-6">
            <dl className="grid grid-cols-3 gap-2 text-center">
              <Stat label={t('history.streak')} value={t('history.days', { n: stats.streak })} />
              <Stat
                label={t('history.bestStreak')}
                value={t('history.days', { n: stats.bestStreak })}
              />
              <Stat label={t('history.completed')} value={`${stats.completed}/${stats.total}`} />
              <Stat label={t('history.average')} value={formatTileHours(stats.averageMs)} />
              <Stat label={t('history.longest')} value={formatTileHours(stats.longestMs)} />
              <Stat
                label={t('history.total')}
                value={`${Math.round(stats.totalMs / 3_600_000)}h`}
              />
            </dl>

            <WeeklyChart hoursByDay={stats.hoursByDay} goalHours={targetHours} />
            <MonthCalendar completedDays={stats.completedDays} />
            <WeightSection />
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-extrabold">{t('history.fasts')}</h2>
            <ul className="flex flex-col gap-2">
              {items.map((f) => {
                const done = isCompleted(f)
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(f)}
                      className="flex w-full items-center gap-4 rounded-2xl border border-input px-4 py-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <span
                        className={`size-3 shrink-0 rounded-full ${done ? 'bg-[var(--lagoon)]' : 'bg-foreground/20'}`}
                      >
                        <span className="sr-only">
                          {done ? t('history.goalMet') : t('history.goalMissed')}
                        </span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-semibold text-muted-foreground">
                          {capitalize(formatDate(f.startedAt, locale))}
                          {f.rating > 0 && ` · ${RATINGS[f.rating - 1]}`}
                        </span>
                        {f.note && <span className="truncate text-sm">{f.note}</span>}
                      </span>
                      <span className="flex flex-col items-end">
                        <span className="font-display text-xl font-extrabold tabular-nums">
                          {formatHours(durationMs(f))}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {t('history.ofTarget', { h: f.targetHours })}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}

      {editing && (
        <FastDialog
          fast={editing}
          mode="edit-past"
          onClose={() => setEditing(null)}
          onSave={(patch) => fasts().update(editing.id, patch)}
          onDelete={() => fasts().delete(editing.id)}
        />
      )}
    </AppShell>
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
