import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppShell } from '#/components/app-shell'
import { FastDialog } from '#/components/fast-dialog'
import { Delayed, Skeleton } from '#/components/skeleton'
import { onCollectionChange } from '#/lib/live'
import { currentUser, currentUserId, type Fast, fasts, isLoggedIn } from '#/lib/pb'
import { type Translate, useI18n, usePrefs } from '#/lib/preferences'
import { durationMs, isCompleted } from '#/lib/stats'
import { capitalize, formatDate, formatDuration } from '#/lib/time'
import { type Zone, zoneAt } from '#/lib/zones'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (!isLoggedIn()) throw redirect({ to: '/welcome' })
    // First visit: ask for the fasting goal (0 = never chosen).
    if (!currentUser()?.targetHours) throw redirect({ to: '/onboarding' })
  },
  component: Home,
})

/** The running fast (if any) plus the last few finished ones. */
function useRecentFasts() {
  const [state, setState] = useState<{ active: Fast | null; past: Fast[] } | null>(null)

  useEffect(() => {
    const load = () =>
      Promise.all([
        fasts()
          .getList(1, 1, { filter: 'endedAt = ""', sort: '-startedAt', requestKey: null })
          .then((r) => r.items[0] ?? null),
        fasts()
          .getList(1, 7, { filter: 'endedAt != ""', sort: '-endedAt', requestKey: null })
          .then((r) => r.items),
      ])
        .then(([active, past]) => setState({ active, past }))
        .catch(() => setState({ active: null, past: [] }))

    load()
    // Keep every open device in sync.
    return onCollectionChange('fasts', load)
  }, [])

  return {
    fast: state?.active ?? null,
    lastEnded: state?.past[0] ?? null,
    past: state?.past ?? [],
    loading: state === null,
  }
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
  const { t, locale } = useI18n()
  const { targetHours, eatingWindowHours } = usePrefs()
  const { fast, lastEnded, past, loading } = useRecentFasts()
  const now = useNow(Boolean(fast || lastEnded))
  const [dialog, setDialog] = useState<'edit-active' | 'finish' | null>(null)

  async function start() {
    await fasts().create({
      user: currentUserId(),
      startedAt: new Date().toISOString(),
      targetHours,
    })
  }

  if (loading) return <HomeSkeleton />

  const elapsed = fast ? now - new Date(fast.startedAt).getTime() : 0
  const goalMs = fast ? fast.targetHours * 3_600_000 : 0
  const progress = fast ? Math.min(1, elapsed / goalMs) : 0
  const { zone, next } = zoneAt(elapsed)

  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 lg:gap-8">
        <ProgressRing progress={progress} color={fast ? zone.color : undefined}>
          {fast ? (
            <>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {progress >= 1 ? t('home.goalReached') : t('home.fastOf', { h: fast.targetHours })}
              </span>
              <span className="font-display text-5xl font-extrabold tracking-tight tabular-nums lg:text-6xl">
                {formatDuration(elapsed)}
              </span>
              <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                {progress >= 1
                  ? `+${formatDuration(elapsed - goalMs)}`
                  : t('home.remaining', { t: formatDuration(goalMs - elapsed) })}
              </span>
            </>
          ) : (
            <IdleStatus
              t={t}
              lastEnded={lastEnded}
              targetHours={targetHours}
              eatingWindowHours={eatingWindowHours}
              now={now}
            />
          )}
        </ProgressRing>
        <StreakStrip t={t} locale={locale} items={past} />
        {fast && (
          <div className="w-full max-w-sm">
            <ZoneCard t={t} zone={zone} next={next} elapsed={elapsed} />
          </div>
        )}
        <div className="flex w-full max-w-sm flex-col items-center gap-3">
          {fast ? (
            <>
              <button
                type="button"
                onClick={() => setDialog('edit-active')}
                className="text-sm font-semibold text-muted-foreground"
              >
                {t('home.startedAt', { date: formatDate(fast.startedAt, locale) })} ·{' '}
                <span className="underline">{t('home.edit')}</span>
              </button>
              <button
                type="button"
                onClick={() => setDialog('finish')}
                className="w-full rounded-full bg-destructive px-6 py-4 text-lg font-extrabold text-white"
              >
                {t('home.stop')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={start}
              className="w-full rounded-full bg-primary px-6 py-4 text-lg font-extrabold text-primary-foreground"
            >
              {t('home.start')}
            </button>
          )}
        </div>
      </div>
      {fast && dialog && (
        <FastDialog
          fast={fast}
          mode={dialog}
          onClose={() => setDialog(null)}
          onSave={(patch) => fasts().update(fast.id, patch)}
        />
      )}
    </AppShell>
  )
}

function HomeSkeleton() {
  return (
    <AppShell>
      <Delayed>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 lg:gap-8">
          <ProgressRing progress={0}>
            <Skeleton className="h-14 w-40 lg:h-16 lg:w-48" />
            <Skeleton className="h-4 w-24" />
          </ProgressRing>
          <div className="flex gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
              <Skeleton key={i} className="size-9 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-15 w-full max-w-sm rounded-full" />
        </div>
      </Delayed>
    </AppShell>
  )
}

/** Last fasts as a strip of dots, oldest to newest; filled when the goal was met. */
function StreakStrip({ t, locale, items }: { t: Translate; locale: string; items: Fast[] }) {
  if (items.length === 0) return null
  return (
    <Link to="/history" className="flex items-end gap-3" aria-label={t('home.recent')}>
      {[...items].reverse().map((f) => (
        <span
          key={f.id}
          className="flex flex-col items-center gap-1"
          title={capitalize(formatDate(f.startedAt, locale))}
        >
          <span
            className={`grid size-9 place-items-center rounded-full text-[0.65rem] font-extrabold tabular-nums ${
              isCompleted(f)
                ? 'bg-[var(--lagoon)] text-white'
                : 'border-2 border-foreground/20 text-muted-foreground'
            }`}
          >
            {Math.round(durationMs(f) / 3_600_000)}
          </span>
          <span className="text-[0.65rem] font-semibold uppercase text-muted-foreground">
            {new Date(f.startedAt).toLocaleDateString(locale, { weekday: 'narrow' })}
          </span>
        </span>
      ))}
    </Link>
  )
}

/** Between fasts: counts up from the end of the last one. */
function IdleStatus({
  t,
  lastEnded,
  targetHours,
  eatingWindowHours,
  now,
}: {
  t: Translate
  lastEnded: Fast | null
  targetHours: number
  eatingWindowHours: number
  now: number
}) {
  if (!lastEnded) {
    return (
      <>
        <span className="font-display text-6xl font-extrabold tracking-tight lg:text-7xl">
          {targetHours}h
        </span>
        <span className="text-sm font-semibold text-muted-foreground">{t('home.ready')}</span>
      </>
    )
  }
  const since = now - new Date(lastEnded.endedAt).getTime()
  const untilNext = eatingWindowHours * 3_600_000 - since
  return (
    <>
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {t('home.sinceLast')}
      </span>
      <span className="font-display text-5xl font-extrabold tracking-tight tabular-nums lg:text-6xl">
        {formatDuration(since)}
      </span>
      {eatingWindowHours > 0 && (
        <span className="text-sm font-semibold text-muted-foreground tabular-nums">
          {untilNext > 0
            ? t('home.nextFastIn', { t: formatDuration(untilNext) })
            : t('home.timeToFast')}
        </span>
      )}
    </>
  )
}

function ZoneCard({
  t,
  zone,
  next,
  elapsed,
}: {
  t: Translate
  zone: Zone
  next?: Zone
  elapsed: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="w-full rounded-2xl border border-input px-4 py-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="size-3 rounded-full" style={{ backgroundColor: zone.color }} />
        <span className="flex-1 font-display text-lg font-extrabold">{t(`zone.${zone.id}`)}</span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && <p className="mt-1 text-sm text-muted-foreground">{t(`zone.${zone.id}.desc`)}</p>}
      {next && (
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground tabular-nums">
          {t('home.nextZoneIn', {
            zone: t(`zone.${next.id}`),
            t: formatDuration(next.fromHours * 3_600_000 - elapsed),
          })}
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
    <div className="relative mx-auto grid size-72 place-items-center sm:size-80 lg:size-[26rem]">
      <svg viewBox="0 0 280 280" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle
          cx="140"
          cy="140"
          r={r}
          fill="none"
          strokeWidth="18"
          className="stroke-foreground/10"
        />
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
      <div className="relative flex flex-col items-center gap-1 text-center">{children}</div>
    </div>
  )
}
