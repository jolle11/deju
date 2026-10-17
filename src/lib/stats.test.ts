import { describe, expect, it } from 'vitest'
import type { Fast } from './pb'
import { computeStats, dayKey, isCompleted, monthComparison, weeklyCompletion } from './stats'

let seq = 0
function fast(startedAt: string, endedAt: string, targetHours = 16): Fast {
  seq++
  return {
    id: `f${seq}`,
    collectionId: '',
    collectionName: 'fasts',
    user: 'u',
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    targetHours,
    note: '',
  }
}

describe('isCompleted', () => {
  it('compares against the fast own goal', () => {
    expect(isCompleted(fast('2026-01-01T20:00', '2026-01-02T12:00'))).toBe(true)
    expect(isCompleted(fast('2026-01-01T20:00', '2026-01-02T11:59'))).toBe(false)
    expect(isCompleted(fast('2026-01-01T20:00', '2026-01-02T11:00', 15))).toBe(true)
  })
})

describe('computeStats', () => {
  const now = new Date('2026-01-05T09:00')

  it('counts a streak ending yesterday when today is not done yet', () => {
    const items = [
      fast('2026-01-02T20:00', '2026-01-03T12:00'),
      fast('2026-01-03T20:00', '2026-01-04T12:00'),
    ]
    expect(computeStats(items, now).streak).toBe(2)
  })

  it('breaks the streak on a missed day and keeps the best one', () => {
    const items = [
      fast('2025-12-28T20:00', '2025-12-29T12:00'),
      fast('2025-12-29T20:00', '2025-12-30T12:00'),
      fast('2025-12-30T20:00', '2025-12-31T12:00'),
      fast('2026-01-03T20:00', '2026-01-04T12:00'),
    ]
    const stats = computeStats(items, now)
    expect(stats.streak).toBe(1)
    expect(stats.bestStreak).toBe(3)
  })

  it('keeps consecutive days across the DST change', () => {
    // Europe/Madrid moves to summer time on 2026-03-29.
    const items = [
      fast('2026-03-28T20:00', '2026-03-29T13:00'), // 16 real hours: one is skipped
      fast('2026-03-29T20:00', '2026-03-30T12:00'),
    ]
    const stats = computeStats(items, new Date('2026-03-30T13:00'))
    expect(stats.streak).toBe(2)
    expect(stats.bestStreak).toBe(2)
  })

  it('marks days that only reached the minimum', () => {
    const short = fast('2026-01-03T22:00', '2026-01-04T11:00')
    const stats = computeStats([short], now)
    expect(stats.dayLevels.get('2026-01-04')).toBe('min')
    expect(stats.streak).toBe(0)
  })

  it('totals and averages durations', () => {
    const items = [
      fast('2026-01-01T00:00', '2026-01-01T16:00'),
      fast('2026-01-02T00:00', '2026-01-02T20:00'),
    ]
    const stats = computeStats(items, now)
    expect(stats.totalMs).toBe(36 * 3_600_000)
    expect(stats.averageMs).toBe(18 * 3_600_000)
    expect(stats.longestMs).toBe(20 * 3_600_000)
  })
})

describe('dayKey', () => {
  it('uses the local calendar day', () => {
    expect(dayKey(new Date('2026-01-04T23:30'))).toBe('2026-01-04')
  })
})

describe('period stats', () => {
  const now = new Date('2026-03-18T10:00') // Wednesday

  it('compares this month with the previous one by end date', () => {
    const items = [
      fast('2026-02-27T20:00', '2026-02-28T13:00'), // Feb, met
      fast('2026-02-28T20:00', '2026-03-01T10:00'), // ends in March, missed
      fast('2026-03-10T20:00', '2026-03-11T14:00'), // March, met
    ]
    const { current, previous } = monthComparison(items, now)
    expect(current).toMatchObject({ count: 2, completed: 1, rate: 0.5 })
    expect(previous).toMatchObject({ count: 1, completed: 1, rate: 1 })
    expect(current.averageMs).toBe(16 * 3_600_000)
  })

  it('reports no rate for an empty period', () => {
    expect(monthComparison([], now).current.rate).toBeNull()
  })

  it('groups completion by Monday-first weeks ending this week', () => {
    const weeks = weeklyCompletion(
      [fast('2026-03-15T20:00', '2026-03-16T13:00'), fast('2026-03-08T20:00', '2026-03-09T10:00')],
      3,
      now,
    )
    expect(weeks.map((w) => dayKey(w.weekStart))).toEqual([
      '2026-03-02',
      '2026-03-09',
      '2026-03-16',
    ])
    expect(weeks.map((w) => [w.count, w.completed])).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
    ])
  })
})
