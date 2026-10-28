import { describe, expect, it } from 'vitest'
import { weightTrend } from './body'
import type { Measurement } from './pb'

const m = (date: string, weightKg: number, waistCm = 0) =>
  ({ id: date, date, weightKg, waistCm, user: 'u' }) as Measurement

describe('weightTrend', () => {
  it('has no change with fewer than two weights', () => {
    expect(weightTrend([m('2026-01-01', 80)]).change).toBeNull()
  })

  it('orders by date and skips entries without weight', () => {
    const { points, change } = weightTrend([
      m('2026-01-10', 78),
      m('2026-01-05', 0, 90),
      m('2026-01-01', 80),
    ])
    expect(points.map((p) => p.kg)).toEqual([80, 78])
    expect(change).toBe(-2)
  })
})
