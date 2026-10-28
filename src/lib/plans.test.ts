import { describe, expect, it } from 'vitest'
import { matchPlan, PLANS } from './plans'

describe('plans', () => {
  it('fills a whole day', () => {
    for (const p of PLANS) expect(p.fastHours + p.windowHours).toBe(24)
  })

  it('matches only exact goal and window', () => {
    expect(matchPlan(16, 8)?.id).toBe('16:8')
    expect(matchPlan(16, 0)).toBeNull()
  })
})
