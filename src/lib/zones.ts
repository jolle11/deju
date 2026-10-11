import { ZONE_START_HOURS, type ZoneId } from '../../worker/src/zone-starts.ts'

export type Zone = {
  /** Also the i18n key: `zone.<id>` and `zone.<id>.desc` */
  id: ZoneId
  fromHours: number
  color: string
}

/** Timer colour per zone (overridable by the theme via --zone-color). */
const ZONE_COLORS: Record<ZoneId, string> = {
  anabolic: '#94a3b8',
  catabolic: '#60d7cf',
  'fat-burning': '#f5a524',
  ketosis: '#f2555a',
  'deep-ketosis': '#b57cf6',
}

/** Metabolic phases shown on the timer; start hours are shared with the worker. */
export const ZONES: Zone[] = (Object.keys(ZONE_START_HOURS) as ZoneId[])
  .map((id) => ({
    id,
    fromHours: ZONE_START_HOURS[id],
    color: `var(--zone-color, ${ZONE_COLORS[id]})`,
  }))
  .sort((a, b) => a.fromHours - b.fromHours)

export function zoneAt(elapsedMs: number) {
  const hours = elapsedMs / 3_600_000
  let index = 0
  ZONES.forEach((z, i) => {
    if (hours >= z.fromHours) index = i
  })
  return { zone: ZONES[index], next: ZONES[index + 1] as Zone | undefined }
}
