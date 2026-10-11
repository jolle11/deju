import { describe, expect, it } from 'vitest'
import { zoneAt } from './zones'

const h = (hours: number) => hours * 3_600_000

describe('zoneAt', () => {
  it('returns the current zone and the next one', () => {
    expect(zoneAt(0).zone.id).toBe('anabolic')
    expect(zoneAt(h(16)).zone.id).toBe('fat-burning')
    expect(zoneAt(h(23.9)).next?.id).toBe('ketosis')
  })

  it('has no next zone after the last one', () => {
    expect(zoneAt(h(100)).zone.id).toBe('deep-ketosis')
    expect(zoneAt(h(100)).next).toBeUndefined()
  })
})
