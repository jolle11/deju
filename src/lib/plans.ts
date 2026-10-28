/** Common daily schedules: fasting hours, then the eating window until the next fast. */
export const PLANS = [
  { id: '14:10', fastHours: 14, windowHours: 10 },
  { id: '16:8', fastHours: 16, windowHours: 8 },
  { id: '18:6', fastHours: 18, windowHours: 6 },
  { id: '20:4', fastHours: 20, windowHours: 4 },
  { id: 'omad', fastHours: 23, windowHours: 1 },
] as const

export type Plan = (typeof PLANS)[number]

/** The plan matching a goal and eating window, if any. */
export function matchPlan(fastHours: number, windowHours: number) {
  return PLANS.find((p) => p.fastHours === fastHours && p.windowHours === windowHours) ?? null
}
