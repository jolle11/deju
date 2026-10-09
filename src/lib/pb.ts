import PocketBase, { type RecordModel } from 'pocketbase'

export const pb = new PocketBase(
  import.meta.env.VITE_PB_URL ?? 'http://127.0.0.1:8090',
)

export type Fast = RecordModel & {
  user: string
  startedAt: string
  endedAt: string
  targetHours: number
  note: string
}

export const fasts = () => pb.collection<Fast>('fasts')

export function isLoggedIn() {
  return pb.authStore.isValid
}

export function currentUserId() {
  const id = pb.authStore.record?.id
  if (!id) throw new Error('Not authenticated')
  return id
}
