import { createFileRoute, redirect } from '@tanstack/react-router'
import type { RecordSubscription } from 'pocketbase'
import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '#/components/app-shell'
import { Badges } from '#/components/badges'
import { BodySection } from '#/components/body-section'
import { FastDialog } from '#/components/fast-dialog'
import { MonthComparison, WeeklyCompletionChart } from '#/components/period-stats'
import { Delayed, Skeleton } from '#/components/skeleton'
import { FastingHeatmap, MonthCalendar, WeeklyChart } from '#/components/stats'
import { applyEvent, onCollectionChange } from '#/lib/live'
import { type Fast, fasts, isLoggedIn } from '#/lib/pb'
import { useI18n, usePrefs } from '#/lib/preferences'
import { renderMonthCard, shareImage } from '#/lib/share-card'
import {
  computeStats,
  dayKey,
  durationMs,
  fastLevel,
  MIN_FAST_HOURS,
  summarizePeriod,
} from '#/lib/stats'
import { capitalize, dateFormat, formatDate, formatHours } from '#/lib/time'

export const Route = createFileRoute('/history')({
  beforeLoad: () => {
    if (!isLoggedIn()) throw redirect({ to: '/welcome' })
  },
  component: History,
})

/** List marker: goal met, at least MIN_FAST_HOURS, or neither. */
const DOT_CLASS = {
  goal: 'bg-[var(--lagoon)]',
  min: 'bg-[var(--lagoon)]/35 ring-1 ring-[var(--lagoon)]',
  none: 'bg-foreground/20',
}

/** Fasts listed at a time; stats always use the full history. */
const PAGE_SIZE = 20

const isPast = (f: Fast) => Boolean(f.endedAt)
const newestFirst = (a: Fast, b: Fast) => b.startedAt.localeCompare(a.startedAt)

/** Every finished fast, loaded once and then kept in sync from realtime events. */
function usePastFasts() {
  const [items, setItems] = useState<Fast[] | null>(null)

  useEffect(() => {
    fasts()
      .getFullList({
        filter: 'endedAt != ""',
        sort: '-startedAt',
        // Only what the stats and list need: keeps long histories light.
        fields: 'id,collectionId,collectionName,user,startedAt,endedAt,targetHours,note',
        requestKey: null,
      })
      .then(setItems)
      .catch(() => setItems([]))

    return onCollectionChange('fasts', (event) =>
      setItems((list) =>
        list ? applyEvent(list, event as RecordSubscription<Fast>, isPast, newestFirst) : list,
      ),
    )
  }, [])

  return items
}

function History() {
  const { t, locale } = useI18n()
  const { targetHours, bodyTracking } = usePrefs()
  const items = usePastFasts()
  const [editing, setEditing] = useState<Fast | null>(null)
  const [visible, setVisible] = useState(PAGE_SIZE)
  // Recomputed only when the fasts change, not on every render.
  const stats = useMemo(() => computeStats(items ?? []), [items])

  /** Builds the month image in the current theme and hands it to the share sheet. */
  async function shareMonth(month: Date) {
    const all = items ?? []
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1)
    const summary = summarizePeriod(all, month, next)
    const goalDays = [...stats.dayLevels].filter(
      ([key, level]) => level === 'goal' && key.startsWith(dayKey(month).slice(0, 8)),
    ).length
    const title = capitalize(dateFormat(locale, { month: 'long', year: 'numeric' }).format(month))
    const narrow = dateFormat(locale, { weekday: 'narrow' })
    const blob = await renderMonthCard({
      title,
      month,
      dayLevels: stats.dayLevels,
      weekdayLabels: Array.from({ length: 7 }, (_, i) => narrow.format(new Date(2024, 0, 1 + i))),
      figures: [
        [t('periods.fasts'), String(summary.count)],
        [t('periods.rate'), summary.rate === null ? '–' : `${Math.round(summary.rate * 100)}%`],
        [t('periods.average'), summary.count ? formatTileHours(summary.averageMs) : '–'],
        [t('periods.total'), `${Math.round(summary.totalMs / 3_600_000)}h`],
      ],
      footer: t('share.footer', { n: goalDays }),
    })
    await shareImage(blob, `deju-${dayKey(month).slice(0, 7)}.png`, title)
  }

  if (!items) {
    return (
      <AppShell title={t('history.title')}>
        <HistorySkeleton />
      </AppShell>
    )
  }

  return (
    <AppShell title={t('history.title')}>
      {items.length === 0 ? (
        <div className="flex flex-col gap-6">
          <p className="py-16 text-center text-muted-foreground">{t('history.empty')}</p>
          {bodyTracking === 'on' && <BodySection />}
        </div>
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

            <WeeklyChart
              hoursByDay={stats.hoursByDay}
              dayLevels={stats.dayLevels}
              goalHours={targetHours}
            />
            <MonthCalendar dayLevels={stats.dayLevels} onShare={shareMonth} />
            <FastingHeatmap hoursByDay={stats.hoursByDay} dayLevels={stats.dayLevels} />
            <MonthComparison items={items} />
            <WeeklyCompletionChart items={items} />
            <Badges stats={stats} />
            {bodyTracking === 'on' && <BodySection />}
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-extrabold">{t('history.fasts')}</h2>
            <ul className="flex flex-col gap-2">
              {items.slice(0, visible).map((f) => {
                const level = fastLevel(f)
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(f)}
                      className="flex w-full items-center gap-4 rounded-2xl border border-input px-4 py-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <span
                        className={`size-3 shrink-0 rounded-full ${DOT_CLASS[level ?? 'none']}`}
                      >
                        <span className="sr-only">
                          {level === 'goal'
                            ? t('history.goalMet')
                            : level === 'min'
                              ? t('calendar.legendMin', { h: MIN_FAST_HOURS })
                              : t('history.goalMissed')}
                        </span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-semibold text-muted-foreground">
                          {capitalize(formatDate(f.startedAt, locale))}
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
            {items.length > visible && (
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="self-center rounded-full border border-input px-4 py-2 text-sm font-bold"
              >
                {t('history.showMore', { n: items.length - visible })}
              </button>
            )}
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

function HistorySkeleton() {
  return (
    <Delayed>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            <Skeleton key={i} className="h-[4.75rem] rounded-2xl" />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="mb-1 h-7 w-28" />
          {Array.from({ length: 5 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            <Skeleton key={i} className="h-[4.25rem] rounded-2xl" />
          ))}
        </div>
      </div>
    </Delayed>
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
