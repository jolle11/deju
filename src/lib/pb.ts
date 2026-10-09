import PocketBase, { type RecordModel } from 'pocketbase'

export const pb = new PocketBase(import.meta.env.VITE_PB_URL ?? 'http://127.0.0.1:8090')

export type Fast = RecordModel & {
  user: string
  startedAt: string
  endedAt: string
  targetHours: number
  note: string
  /** 0 = not rated, 1..5 */
  rating: number
}

export type User = RecordModel & {
  email: string
  /** 0 = no next-fast reminder */
  eatingWindowHours: number
  language: string
  /** Locale the client resolved; used by the worker for notifications. */
  locale: string
  theme: string
  accent: string
  targetHours: number
}

export const fasts = () => pb.collection<Fast>('fasts')
export const users = () => pb.collection<User>('users')

export function currentUser() {
  return pb.authStore.record as User | null
}

export function isLoggedIn() {
  return pb.authStore.isValid
}

export function currentUserId() {
  const id = pb.authStore.record?.id
  if (!id) throw new Error('Not authenticated')
  return id
}
