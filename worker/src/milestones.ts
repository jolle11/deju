import { type Locale, TEXTS } from './i18n.ts'

export type Milestone = { kind: string; hours: number; title: string; body: string }

const INTERMEDIATE_HOURS = [12, 16, 18, 24, 36, 48, 72]

/** Hours where a new fasting zone starts. Keep in sync with src/lib/zones.ts. */
const ZONE_STARTS = { 16: 'fat-burning', 24: 'ketosis', 72: 'deep-ketosis' } as const

export function milestonesFor(targetHours: number, locale: Locale = 'es'): Milestone[] {
  const tx = TEXTS[locale]
  const list: Milestone[] = INTERMEDIATE_HOURS.filter((h) => h < targetHours).map((h) => {
    const zoneId = ZONE_STARTS[h as keyof typeof ZONE_STARTS]
    const zone = zoneId ? tx.zones[zoneId] : undefined
    const remaining = tx.remaining(targetHours - h)
    return {
      kind: `${h}h`,
      hours: h,
      title: zone ? `${zone.title} · ${h}h` : tx.hours(h),
      body: zone ? `${zone.body} ${remaining}` : `${tx.elapsed(h)} ${remaining}`,
    }
  })
  list.push({
    kind: 'goal',
    hours: targetHours,
    title: tx.goalTitle,
    body: tx.goalBody(targetHours),
  })
  return list
}

/** Milestones already reached, ordered from oldest to newest. */
export function reachedMilestones(
  startedAt: Date,
  targetHours: number,
  now: Date,
  locale: Locale = 'es',
) {
  const elapsedHours = (now.getTime() - startedAt.getTime()) / 3_600_000
  return milestonesFor(targetHours, locale).filter((m) => elapsedHours >= m.hours)
}
