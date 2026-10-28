import type { RecordModel } from 'pocketbase'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./pb', () => ({ pb: { authStore: { isValid: false, onChange: () => {} } } }))

const { applyEvent } = await import('./live')

type Item = RecordModel & { n: number; done: boolean }
const item = (id: string, n: number, done = true) =>
  ({ id, n, done, collectionId: '', collectionName: 'x' }) as Item
const keep = (r: Item) => r.done
const byN = (a: Item, b: Item) => b.n - a.n

describe('applyEvent', () => {
  const items = [item('a', 3), item('b', 1)]

  it('inserts created records in order', () => {
    const next = applyEvent(items, { action: 'create', record: item('c', 2) }, keep, byN)
    expect(next.map((r) => r.id)).toEqual(['a', 'c', 'b'])
  })

  it('replaces updated records and resorts', () => {
    const next = applyEvent(items, { action: 'update', record: item('b', 5) }, keep, byN)
    expect(next.map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('drops deleted records and ones that stop matching', () => {
    expect(applyEvent(items, { action: 'delete', record: items[0] }, keep, byN)).toEqual([items[1]])
    const undone = applyEvent(items, { action: 'update', record: item('a', 3, false) }, keep, byN)
    expect(undone.map((r) => r.id)).toEqual(['b'])
  })
})
