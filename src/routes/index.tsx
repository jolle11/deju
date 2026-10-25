import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShell } from '#/components/app-shell'
import { Dialog } from '#/components/dialog'
import { FastDialog } from '#/components/fast-dialog'
import { Delayed, Skeleton } from '#/components/skeleton'
import { onCollectionChange } from '#/lib/live'
import {
  currentUser,
  currentUserId,
  type Fast,
  fasts,
  isLoggedIn,
  USER_CACHE_PREFIX,
} from '#/lib/pb'
import { type Translate, useI18n, usePrefs } from '#/lib/preferences'
import { fastLevel } from '#/lib/stats'
import { capitalize, dateFormat, formatDate, formatDuration } from '#/lib/time'
import { cn } from '#/lib/utils'
import { ZONES, type Zone, zoneAt } from '#/lib/zones'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (!isLoggedIn()) throw redirect({ to: '/welcome' })
    // First visit: ask for the fasting goal (0 = never chosen).
    if (!currentUser()?.targetHours) throw redirect({ to: '/onboarding' })
  },
  component: Home,
})

type RecentFasts = { active: Fast | null; past: Fast[] }

const recentCacheKey = () => `${USER_CACHE_PREFIX}recent-fasts:${currentUserId()}`

function readRecentCache(): RecentFasts | null {
  try {
    return JSON.parse(localStorage.getItem(recentCacheKey()) ?? 'null')
  } catch {
    return null
  }
}

/** An end time that could not reach the server yet (offline). */
type PendingStop = { id: string; endedAt: string }

const pendingStopKey = () => `${USER_CACHE_PREFIX}pending-stop:${currentUserId()}`

function readPendingStop(): PendingStop | null {
  try {
    return JSON.parse(localStorage.getItem(pendingStopKey()) ?? 'null')
  } catch {
    return null
  }
}

function writePendingStop(pending: PendingStop | null) {
  if (pending) localStorage.setItem(pendingStopKey(), JSON.stringify(pending))
  else localStorage.removeItem(pendingStopKey())
}

/** PocketBase reports network failures (offline, aborted) as status 0. */
const isNetworkError = (err: unknown) => (err as { status?: number }).status === 0

/** Sends a queued end time. Only network failures keep it queued. */
async function flushPendingStop() {
  const pending = readPendingStop()
  if (!pending) return
  try {
    await fasts().update(pending.id, { endedAt: pending.endedAt }, { requestKey: null })
    writePendingStop(null)
  } catch (err) {
    if (!isNetworkError(err)) writePendingStop(null)
  }
}

/**
 * The running fast (if any) plus the last few finished ones. Starts from the
 * copy saved on the last visit so the screen paints instantly, then refreshes.
 */
function useRecentFasts() {
  const [state, setState] = useState<RecentFasts | null>(readRecentCache)

  const load = useCallback(
    () =>
      flushPendingStop()
        .then(() =>
          Promise.all([
            fasts()
              .getList(1, 1, { filter: 'endedAt = ""', sort: '-startedAt', requestKey: null })
              .then((r) => r.items[0] ?? null),
            fasts()
              .getList(1, 7, { filter: 'endedAt != ""', sort: '-endedAt', requestKey: null })
              .then((r) => r.items),
          ]),
        )
        .then(([serverActive, past]) => {
          // A stop still queued offline wins over the server's stale copy.
          const active = serverActive?.id === readPendingStop()?.id ? null : serverActive
          setState({ active, past })
          localStorage.setItem(recentCacheKey(), JSON.stringify({ active, past }))
        })
        .catch(() => setState((s) => s ?? { active: null, past: [] })),
    [],
  )

  useEffect(() => {
    load()
    window.addEventListener('online', load)
    // Keep every open device in sync.
    const unsubscribe = onCollectionChange('fasts', load)
    return () => {
      window.removeEventListener('online', load)
      unsubscribe()
    }
  }, [load])

  /** Paint the new running fast right away; realtime/refetch confirms it. */
  function setActive(active: Fast | null) {
    setState((s) => ({ active, past: s?.past ?? [] }))
  }

  return {
    setActive,
    reload: load,
    fast: state?.active ?? null,
    lastEnded: state?.past[0] ?? null,
    past: state?.past ?? [],
    loading: state === null,
  }
}

/** Ticks every second while enabled and the page is visible. */
function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    let id: ReturnType<typeof setInterval> | undefined
    const sync = () => {
      clearInterval(id)
      if (document.visibilityState !== 'visible') return
      setNow(Date.now())
      id = setInterval(() => setNow(Date.now()), 1000)
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [enabled])
  return now
}

function Home() {
  const { t, locale } = useI18n()
  const { targetHours, eatingWindowHours } = usePrefs()
  const { fast, lastEnded, past, loading, setActive, reload } = useRecentFasts()
  const now = useNow(Boolean(fast || lastEnded))
  const [dialog, setDialog] = useState<'edit-active' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // The fast being created, so edits made before the server answers can wait for its id.
  const pendingCreate = useRef<Promise<Fast> | null>(null)

  async function start() {
    const draft = {
      user: currentUserId(),
      startedAt: new Date().toISOString(),
      endedAt: '',
      targetHours,
      note: '',
    }
    setNotice(null)
    setActive({ ...draft, id: '', collectionId: '', collectionName: 'fasts' } as Fast)
    const created = fasts().create<Fast>(draft)
    pendingCreate.current = created
    try {
      setActive(await created)
    } catch (err) {
      // Otherwise another device already started one; the reload shows it.
      if (isNetworkError(err)) setNotice(t('home.startError'))
      reload()
    } finally {
      if (pendingCreate.current === created) pendingCreate.current = null
    }
  }

  async function stop() {
    if (!fast) return
    const active = fast
    const endedAt = new Date().toISOString()
    setActive(null)
    setNotice(null)
    try {
      const id = active.id || (await pendingCreate.current)?.id
      if (!id) throw new Error(t('common.saveError'))
      try {
        await fasts().update(id, { endedAt })
      } catch (err) {
        if (!isNetworkError(err)) throw err
        // Keep the real end time and send it once back online.
        writePendingStop({ id, endedAt })
        setNotice(t('home.stopQueued'))
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t('common.saveError'))
    } finally {
      reload()
    }
  }

  if (loading) return <HomeSkeleton />

  const elapsed = fast ? now - new Date(fast.startedAt).getTime() : 0
  const goalMs = fast ? fast.targetHours * 3_600_000 : 0
  const progress = fast ? Math.min(1, elapsed / goalMs) : 0
  const { zone, next } = zoneAt(elapsed)

  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 lg:gap-8">
        <ProgressRing
          progress={progress}
          color={fast ? zone.color : undefined}
          syncing={fast?.id === ''}
        >
          {fast ? (
            <>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {progress >= 1 ? t('home.goalReached') : t('home.fastOf', { h: fast.targetHours })}
              </span>
              <span className="font-display text-5xl font-extrabold tracking-tight tabular-nums lg:text-6xl">
                {formatDuration(elapsed)}
              </span>
              {progress >= 1 ? (
                <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                  +{formatDuration(elapsed - goalMs)}
                </span>
              ) : (
                <NextMilestone
                  t={t}
                  locale={locale}
                  startedAt={fast.startedAt}
                  elapsed={elapsed}
                  targetHours={fast.targetHours}
                />
              )}
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
        {/* Announces milestones to screen readers; the ticking timer itself stays silent. */}
        <p aria-live="polite" className="sr-only">
          {fast && (progress >= 1 ? t('home.goalReached') : t(`zone.${zone.id}`))}
        </p>
        <StreakStrip t={t} locale={locale} items={past} />
        {fast && (
          <div className="w-full max-w-sm">
            <ZoneCard t={t} zone={zone} next={next} elapsed={elapsed} />
          </div>
        )}
        <div className="flex w-full max-w-sm flex-col items-center gap-3">
          {notice && (
            <p role="alert" className="text-center text-sm font-semibold text-destructive">
              {notice}
            </p>
          )}
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
                onClick={stop}
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
          onSave={async (patch) => {
            const id = fast.id || (await pendingCreate.current)?.id
            if (!id) throw new Error(t('common.saveError'))
            await fasts().update(id, patch)
            if (patch.endedAt) setActive(null)
            reload()
          }}
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

const STRIP_CLASS = {
  goal: 'bg-[var(--lagoon)] text-white',
  min: 'bg-[var(--lagoon)]/25 text-foreground ring-2 ring-inset ring-[var(--lagoon)]/60',
  none: 'border-2 border-foreground/20 text-muted-foreground',
}

/**
 * Last fasts as a strip of dots, oldest to newest: filled when the goal was
 * met, tinted when it reached MIN_FAST_HOURS, outlined otherwise.
 */
function StreakStrip({ t, locale, items }: { t: Translate; locale: string; items: Fast[] }) {
  if (items.length === 0) return null
  return (
    <Link to="/history" className="flex items-end gap-3" aria-label={t('home.recent')}>
      {[...items].reverse().map((f) => (
        <span
          key={f.id}
          className="flex flex-col items-center gap-1"
          title={capitalize(formatDate(f.endedAt ?? f.startedAt, locale))}
        >
          <span
            className={`grid size-9 place-items-center rounded-full text-[0.65rem] font-extrabold tabular-nums ${
              STRIP_CLASS[fastLevel(f) ?? 'none']
            }`}
          >
            {new Date(f.endedAt ?? f.startedAt).getDate()}
          </span>
          <span className="text-[0.65rem] font-semibold uppercase text-muted-foreground">
            {new Date(f.endedAt ?? f.startedAt).toLocaleDateString(locale, { weekday: 'narrow' })}
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
  const name = t(`zone.${zone.id}`)
  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-input px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: zone.color }} />
          <span className="font-display text-lg font-extrabold">{name}</span>
        </div>
        {next && (
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground tabular-nums">
            {t('home.nextZoneIn', {
              zone: t(`zone.${next.id}`),
              t: formatDuration(next.fromHours * 3_600_000 - elapsed),
            })}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('zone.infoFor', { zone: name })}
        className="grid size-12 shrink-0 place-items-center rounded-full border border-input bg-foreground/5 text-foreground transition-colors hover:bg-foreground/10 active:scale-95"
      >
        <Info className="size-6" aria-hidden="true" />
      </button>
      {open && <ZoneInfoDialog t={t} zone={zone} onClose={() => setOpen(false)} />}
    </div>
  )
}

function ZoneInfoDialog({ t, zone, onClose }: { t: Translate; zone: Zone; onClose: () => void }) {
  const i = ZONES.indexOf(zone)
  const steps = [
    { label: t('zone.previous'), z: ZONES[i - 1] },
    { label: t('zone.current'), z: zone, current: true },
    { label: t('zone.next'), z: ZONES[i + 1] },
  ].filter((s): s is { label: string; z: Zone; current?: boolean } => !!s.z)
  return (
    <Dialog title={t('zone.info')} onClose={onClose}>
      <ol className="flex flex-col gap-2">
        {steps.map(({ label, z, current }) => (
          <li
            key={z.id}
            className={cn(
              'rounded-2xl border px-4 py-3',
              current ? 'border-2' : 'border-input opacity-70',
            )}
            style={current ? { borderColor: z.color } : undefined}
          >
            <div className="flex items-center gap-2">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: z.color }} />
              <span className="flex-1 font-display text-lg font-extrabold">
                {t(`zone.${z.id}`)}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
            </div>
            <p className="mt-1 text-xs font-bold text-muted-foreground tabular-nums">
              {t('zone.from', { h: z.fromHours })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t(`zone.${z.id}.desc`)}</p>
          </li>
        ))}
      </ol>
      <button
        type="button"
        data-dialog-initial-focus
        onClick={onClose}
        className="rounded-full bg-primary px-4 py-3 font-bold text-primary-foreground"
      >
        {t('common.close')}
      </button>
    </Dialog>
  )
}

/** Hours where a fast already counts (12h minimum, then 13h), before the user's goal. */
const MILESTONE_HOURS = [12, 13]

/**
 * Next milestone: 12h, then 13h, then the goal. Counts down to the first one;
 * past it, says at what time of day the next one is reached.
 */
function NextMilestone({
  t,
  locale,
  startedAt,
  elapsed,
  targetHours,
}: {
  t: Translate
  locale: string
  startedAt: string
  elapsed: number
  targetHours: number
}) {
  const h = MILESTONE_HOURS.find((m) => m < targetHours && m * 3_600_000 > elapsed) ?? targetHours
  const firstReached = elapsed >= Math.min(MILESTONE_HOURS[0], targetHours) * 3_600_000
  const at = new Date(new Date(startedAt).getTime() + h * 3_600_000)
  return (
    <span className="text-sm font-semibold text-muted-foreground tabular-nums">
      {firstReached
        ? t('home.hourAt', {
            h,
            time: dateFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(at),
          })
        : t('home.untilHour', { h, t: formatDuration(h * 3_600_000 - elapsed) })}
    </span>
  )
}

function ProgressRing({
  progress,
  color,
  syncing = false,
  children,
}: {
  progress: number
  color?: string
  /** Not yet saved on the server: pulse the track as a quiet hint. */
  syncing?: boolean
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
          className={cn('stroke-foreground/10', syncing && 'animate-pulse')}
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
