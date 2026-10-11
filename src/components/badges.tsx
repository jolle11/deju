import { Award, Clock, Flame, type LucideIcon, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { type BadgeKind, badgeProgress } from '#/lib/badges'
import type { MessageKey } from '#/lib/messages'
import { currentUserId, USER_CACHE_PREFIX } from '#/lib/pb'
import { useI18n } from '#/lib/preferences'
import type { computeStats } from '#/lib/stats'

const ICONS: Record<BadgeKind, LucideIcon> = {
  completed: Trophy,
  longest: Clock,
  streak: Flame,
  hours: Award,
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
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {badges.map((b) => {
          const Icon = ICONS[b.kind]
          const progress = Math.min(1, b.value / b.goal)
          const detail = t(`badges.kind.${b.kind}` as MessageKey, {
            v: Math.floor(b.value),
            goal: b.goal,
          })
          return (
            <li
              key={b.id}
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
                <span className="text-sm leading-tight font-bold">
                  {t(`badge.${b.id}` as MessageKey)}
                </span>
              </span>
              {fresh.has(b.id) && (
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
                  <span
                    className="h-1 overflow-hidden rounded-full bg-foreground/10"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-full bg-[var(--lagoon)]"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </span>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
