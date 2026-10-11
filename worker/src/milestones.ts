import { type Locale, TEXTS } from './i18n.ts'
import { ZONE_START_HOURS } from './zone-starts.ts'

export type Milestone = { kind: string; hours: number; title: string; body: string }

const INTERMEDIATE_HOURS = [12, 16, 18, 24, 36, 48, 72]

/** Zones announced by a notification, keyed by the hour they start. */
const NOTIFIED_ZONES = ['fat-burning', 'ketosis', 'deep-ketosis'] as const
const ZONE_STARTS = new Map<number, (typeof NOTIFIED_ZONES)[number]>(NOTIFIED_ZONES.map((id) => [ZONE_START_HOURS[id], id]))

export function milestonesFor(targetHours: number, locale: Locale = 'es'): Milestone[] {
  const tx = TEXTS[locale]
  const list: Milestone[] = INTERMEDIATE_HOURS.filter((h) => h < targetHours).map((h) => {
    const zoneId = ZONE_STARTS.get(h)
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
