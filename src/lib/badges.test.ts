import { describe, expect, it } from 'vitest'
import { badgeProgress } from './badges'
import { computeStats } from './stats'

describe('badgeProgress', () => {
  it('locks everything without fasts', () => {
    expect(badgeProgress(computeStats([])).every((b) => !b.unlocked)).toBe(true)
  })

  it('unlocks by completed count, longest fast and total hours', () => {
    const stats = {
      ...computeStats([]),
      completed: 12,
      longestMs: 36 * 3_600_000,
      totalMs: 120 * 3_600_000,
      bestStreak: 3,
    }
    const unlocked = badgeProgress(stats)
      .filter((b) => b.unlocked)
      .map((b) => b.id)
    expect(unlocked).toEqual(['first', 'completed10', 'long24', 'long36', 'streak3', 'hours100'])
  })
})
