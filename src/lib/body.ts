import type { Measurement } from './pb'

/** Weights in date order with the change from the first to the latest one. */
export function weightTrend(items: Measurement[]) {
  const points = items
    .filter((m) => m.weightKg > 0)
    .map((m) => ({ date: m.date, kg: m.weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const change = points.length > 1 ? points[points.length - 1].kg - points[0].kg : null
  return { points, change }
}
