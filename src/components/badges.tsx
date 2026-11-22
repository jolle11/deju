import {
  Award,
  CalendarCheck,
  ChevronDown,
  Clock,
  Flame,
  type LucideIcon,
  Trophy,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { BADGE_KINDS, type BadgeKind, type BadgeProgress, badgeProgress } from '#/lib/badges'
import type { MessageKey } from '#/lib/messages'
import { currentUserId, USER_CACHE_PREFIX } from '#/lib/pb'
import { useI18n } from '#/lib/preferences'
import type { computeStats } from '#/lib/stats'

const ICONS: Record<BadgeKind, LucideIcon> = {
  completed: Trophy,
  longest: Clock,
  streak: Flame,
  hours: Award,
  logged: CalendarCheck,
}

const seenKey = () => `${USER_CACHE_PREFIX}seen-badges:${currentUserId()}`

function readSeen(): string[] | null {
  try {
    return JSON.parse(localStorage.getItem(seenKey()) ?? 'null')
  } catch {
    return null
  }
}

/**
 * Badges unlocked since the last visit to this screen. The first visit marks
 * everything as seen, so existing users are not greeted by a wall of "new".
 */
function useNewBadges(unlocked: string[]) {
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const signature = unlocked.join(',')
  useEffect(() => {
    const ids = signature ? signature.split(',') : []
    const seen = readSeen()
    if (seen) setFresh(new Set(ids.filter((id) => !seen.includes(id))))
    localStorage.setItem(seenKey(), JSON.stringify(ids))
  }, [signature])
  return fresh
}

export function Badges({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const { t } = useI18n()
  const badges = badgeProgress(stats)
  const unlocked = badges.filter((b) => b.unlocked)
  const fresh = useNewBadges(unlocked.map((b) => b.id))

  return (
    <section className="rounded-2xl border border-input p-4">
      <header className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-extrabold">{t('badges.title')}</h2>
        <span className="text-sm font-semibold text-muted-foreground tabular-nums">
          {t('badges.count', { n: unlocked.length, total: badges.length })}
        </span>
      </header>
      <div className="mt-3 flex flex-col gap-2">
        {BADGE_KINDS.map((kind) => (
          <BadgeGroup
            key={kind}
            kind={kind}
            badges={badges.filter((b) => b.kind === kind)}
            fresh={fresh}
          />
        ))}
      </div>
    </section>
  )
}

function BadgeGroup({
  kind,
  badges,
  fresh,
}: {
  kind: BadgeKind
  badges: BadgeProgress[]
  fresh: Set<string>
}) {
  const { t } = useI18n()
  const Icon = ICONS[kind]
  const done = badges.filter((b) => b.unlocked).length
  const next = badges.find((b) => !b.unlocked)
  const hasFresh = badges.some((b) => fresh.has(b.id))

  return (
    <details className="group rounded-xl border border-input" open={hasFresh || undefined}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <Icon className="size-5 shrink-0 text-[var(--lagoon)]" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2 text-sm font-bold">
            {t(`badges.cat.${kind}` as MessageKey)}
            {hasFresh && (
              <span className="rounded-full bg-[var(--lagoon)] px-2 text-[0.65rem] font-extrabold uppercase text-[var(--lagoon-foreground)]">
                {t('badges.new')}
              </span>
            )}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {next
              ? t('badges.next', { name: t(`badge.${next.id}` as MessageKey) })
              : t('badges.allDone')}
          </span>
        </span>
        <span className="text-sm font-semibold text-muted-foreground tabular-nums">
          {done}/{badges.length}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <ul className="grid grid-cols-2 gap-2 px-3 pt-1 pb-3">
        {badges.map((b) => (
          <BadgeItem key={b.id} badge={b} isNew={fresh.has(b.id)} />
        ))}
      </ul>
    </details>
  )
}

function BadgeItem({ badge: b, isNew }: { badge: BadgeProgress; isNew: boolean }) {
  const { t } = useI18n()
  const Icon = ICONS[b.kind]
  const progress = Math.min(1, b.value / b.goal)
  const detail = t(`badges.kind.${b.kind}` as MessageKey, {
    v: Math.floor(b.value),
    goal: b.goal,
  })
  return (
    <li
      title={detail}
      className={`relative flex flex-col gap-1.5 rounded-xl border p-3 ${
        b.unlocked
          ? 'border-[var(--lagoon)] bg-[var(--lagoon)]/10'
          : 'border-input text-muted-foreground'
      }`}
    >
      <span className="flex items-center gap-2">
        <Icon
          className={`size-5 shrink-0 ${b.unlocked ? 'text-[var(--lagoon)]' : 'opacity-50'}`}
          aria-hidden="true"
        />
        <span className="text-sm leading-tight font-bold">{t(`badge.${b.id}` as MessageKey)}</span>
      </span>
      {isNew && (
        <span className="absolute -top-2 right-2 rounded-full bg-[var(--lagoon)] px-2 text-[0.65rem] font-extrabold uppercase text-[var(--lagoon-foreground)]">
          {t('badges.new')}
        </span>
      )}
      {b.unlocked ? (
        <span className="sr-only">{detail}</span>
      ) : (
        <>
          <span className="sr-only">{t('badges.locked')}: </span>
          <span className="text-xs tabular-nums">{detail}</span>
          <span className="h-1 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-[var(--lagoon)]"
              style={{ width: `${progress * 100}%` }}
            />
          </span>
        </>
      )}
    </li>
  )
}
