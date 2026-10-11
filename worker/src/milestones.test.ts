import { describe, expect, it } from 'vitest'
import { milestonesFor, reachedMilestones } from './milestones.ts'

describe('milestonesFor', () => {
  it('lists intermediate hours below the goal, then the goal', () => {
    expect(milestonesFor(20).map((m) => m.kind)).toEqual(['12h', '16h', '18h', 'goal'])
  })

  it('does not repeat an hour equal to the goal', () => {
    expect(milestonesFor(16).map((m) => m.kind)).toEqual(['12h', 'goal'])
  })

  it('announces zone changes in the user language', () => {
    expect(milestonesFor(30, 'en').find((m) => m.kind === '24h')?.title).toContain('24h')
  })
})

describe('reachedMilestones', () => {
  it('returns only the milestones already passed', () => {
    const start = new Date('2026-01-01T00:00Z')
    const now = new Date('2026-01-01T17:00Z')
    expect(reachedMilestones(start, 18, now).map((m) => m.kind)).toEqual(['12h', '16h'])
  })
})
