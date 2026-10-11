import type { computeStats } from './stats'

type Stats = ReturnType<typeof computeStats>

export type BadgeKind = 'completed' | 'longest' | 'streak' | 'hours'

export type Badge = {
  /** Also the i18n key suffix: `badge.<id>` */
  id: string
  kind: BadgeKind
  /** Threshold in the kind's unit: fasts, hours or days */
  goal: number
}

/** Ordered easiest first within each kind. */
export const BADGES: Badge[] = [
  { id: 'first', kind: 'completed', goal: 1 },
  { id: 'completed10', kind: 'completed', goal: 10 },
  { id: 'completed50', kind: 'completed', goal: 50 },
  { id: 'completed100', kind: 'completed', goal: 100 },
  { id: 'long24', kind: 'longest', goal: 24 },
  { id: 'long36', kind: 'longest', goal: 36 },
  { id: 'long48', kind: 'longest', goal: 48 },
  { id: 'long72', kind: 'longest', goal: 72 },
  { id: 'streak3', kind: 'streak', goal: 3 },
  { id: 'streak7', kind: 'streak', goal: 7 },
  { id: 'streak30', kind: 'streak', goal: 30 },
  { id: 'hours100', kind: 'hours', goal: 100 },
  { id: 'hours500', kind: 'hours', goal: 500 },
  { id: 'hours1000', kind: 'hours', goal: 1000 },
]

function measure(kind: BadgeKind, stats: Stats) {
  switch (kind) {
    case 'completed':
      return stats.completed
    case 'longest':
      return stats.longestMs / 3_600_000
    case 'streak':
      return stats.bestStreak
    case 'hours':
      return stats.totalMs / 3_600_000
  }
}

export type BadgeProgress = Badge & { value: number; unlocked: boolean }

export function badgeProgress(stats: Stats): BadgeProgress[] {
  return BADGES.map((badge) => {
    const value = measure(badge.kind, stats)
    return { ...badge, value, unlocked: value >= badge.goal }
  })
}
