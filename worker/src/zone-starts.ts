/**
 * Hour at which each fasting zone starts. Shared by the app timer
 * (src/lib/zones.ts) and the worker's notifications, so they never drift.
 * Lives in the worker because its deploy only ships this folder.
 */
export const ZONE_START_HOURS = {
  anabolic: 0,
  catabolic: 4,
  'fat-burning': 16,
  ketosis: 24,
  'deep-ketosis': 72,
} as const

export type ZoneId = keyof typeof ZONE_START_HOURS
