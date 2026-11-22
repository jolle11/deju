import type { computeStats } from './stats'

type Stats = ReturnType<typeof computeStats>

export type BadgeKind = 'completed' | 'longest' | 'streak' | 'hours' | 'logged'

export type Badge = {
  /** Also the i18n key suffix: `badge.<id>` */
  id: string
  kind: BadgeKind
  /** Threshold in the kind's unit: fasts, hours or days */
  goal: number
}

/** Display order of the categories. */
export const BADGE_KINDS: BadgeKind[] = ['completed', 'streak', 'longest', 'hours', 'logged']

/** Ordered easiest first within each kind. */
export const BADGES: Badge[] = [
  { id: 'first', kind: 'completed', goal: 1 },
  { id: 'completed10', kind: 'completed', goal: 10 },
  { id: 'completed25', kind: 'completed', goal: 25 },
  { id: 'completed50', kind: 'completed', goal: 50 },
  { id: 'completed100', kind: 'completed', goal: 100 },
  { id: 'completed250', kind: 'completed', goal: 250 },
  { id: 'completed500', kind: 'completed', goal: 500 },
  { id: 'long16', kind: 'longest', goal: 16 },
  { id: 'long20', kind: 'longest', goal: 20 },
  { id: 'long24', kind: 'longest', goal: 24 },
  { id: 'long36', kind: 'longest', goal: 36 },
  { id: 'long48', kind: 'longest', goal: 48 },
  { id: 'long72', kind: 'longest', goal: 72 },
  { id: 'long96', kind: 'longest', goal: 96 },
  { id: 'long120', kind: 'longest', goal: 120 },
  { id: 'streak3', kind: 'streak', goal: 3 },
  { id: 'streak7', kind: 'streak', goal: 7 },
  { id: 'streak14', kind: 'streak', goal: 14 },
  { id: 'streak30', kind: 'streak', goal: 30 },
  { id: 'streak60', kind: 'streak', goal: 60 },
  { id: 'streak100', kind: 'streak', goal: 100 },
  { id: 'streak180', kind: 'streak', goal: 180 },
  { id: 'streak365', kind: 'streak', goal: 365 },
  { id: 'hours50', kind: 'hours', goal: 50 },
  { id: 'hours100', kind: 'hours', goal: 100 },
  { id: 'hours250', kind: 'hours', goal: 250 },
  { id: 'hours500', kind: 'hours', goal: 500 },
  { id: 'hours1000', kind: 'hours', goal: 1000 },
  { id: 'hours2500', kind: 'hours', goal: 2500 },
  { id: 'hours5000', kind: 'hours', goal: 5000 },
  { id: 'logged5', kind: 'logged', goal: 5 },
  { id: 'logged25', kind: 'logged', goal: 25 },
  { id: 'logged100', kind: 'logged', goal: 100 },
  { id: 'logged365', kind: 'logged', goal: 365 },
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
    case 'logged':
      return stats.total
  }
}

export type BadgeProgress = Badge & { value: number; unlocked: boolean }

export function badgeProgress(stats: Stats): BadgeProgress[] {
  return BADGES.map((badge) => {
    const value = measure(badge.kind, stats)
    return { ...badge, value, unlocked: value >= badge.goal }
  })
}
