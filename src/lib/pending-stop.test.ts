import { beforeEach, describe, expect, it, vi } from 'vitest'

const update = vi.fn()
vi.mock('./pb', () => ({
  USER_CACHE_PREFIX: 'cache:',
  currentUserId: () => 'u1',
  fasts: () => ({ update }),
}))

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
})

const { flushPendingStop, readPendingStop, writePendingStop } = await import('./pending-stop')

describe('flushPendingStop', () => {
  beforeEach(() => {
    store.clear()
    update.mockReset()
  })

  it('does nothing without a queued stop', async () => {
    await flushPendingStop()
    expect(update).not.toHaveBeenCalled()
  })

  it('sends the queued end time and clears it', async () => {
    writePendingStop({ id: 'f1', endedAt: '2026-01-01T10:00:00Z' })
    update.mockResolvedValue({})
    await flushPendingStop()
    expect(update).toHaveBeenCalledWith(
      'f1',
      { endedAt: '2026-01-01T10:00:00Z' },
      { requestKey: null },
    )
    expect(readPendingStop()).toBeNull()
  })

  it('keeps it queued while offline', async () => {
    writePendingStop({ id: 'f1', endedAt: 'x' })
    update.mockRejectedValue({ status: 0 })
    await flushPendingStop()
    expect(readPendingStop()).toEqual({ id: 'f1', endedAt: 'x' })
  })

  it('drops it when the server rejects it', async () => {
    writePendingStop({ id: 'f1', endedAt: 'x' })
    update.mockRejectedValue({ status: 404 })
    await flushPendingStop()
    expect(readPendingStop()).toBeNull()
  })
})
