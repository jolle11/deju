export type Zone = {
  /** Also the i18n key: `zone.<id>` and `zone.<id>.desc` */
  id: 'anabolic' | 'catabolic' | 'fat-burning' | 'ketosis' | 'deep-ketosis'
  fromHours: number
  color: string
}

/** Metabolic phases shown on the timer. Keep in sync with worker/src/milestones.ts. */
export const ZONES: Zone[] = [
  { id: 'anabolic', fromHours: 0, color: '#94a3b8' },
  { id: 'catabolic', fromHours: 4, color: '#60d7cf' },
  { id: 'fat-burning', fromHours: 16, color: '#f5a524' },
  { id: 'ketosis', fromHours: 24, color: '#f2555a' },
  { id: 'deep-ketosis', fromHours: 72, color: '#b57cf6' },
]

export function zoneAt(elapsedMs: number) {
  const hours = elapsedMs / 3_600_000
  let index = 0
  ZONES.forEach((z, i) => {
    if (hours >= z.fromHours) index = i
  })
  return { zone: ZONES[index], next: ZONES[index + 1] as Zone | undefined }
}
