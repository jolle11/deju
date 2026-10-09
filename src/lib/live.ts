import { pb } from './pb'

/**
 * One PocketBase realtime subscription per collection, shared by every screen.
 * Screens only add/remove local listeners, so navigating never tears down the
 * SSE connection mid-handshake (which yields "400 Invalid realtime client").
 */
const listeners = new Map<string, Set<() => void>>()
const subscribed = new Set<string>()

function ensureSubscribed(collection: string, attempt = 0) {
  if (subscribed.has(collection) || !pb.authStore.isValid) return
  subscribed.add(collection)
  pb.collection(collection)
    .subscribe('*', () => {
      for (const fn of listeners.get(collection) ?? []) fn()
    })
    .catch((err) => {
      subscribed.delete(collection)
      console.warn(`realtime subscribe to ${collection} failed`, err)
      // Back off and retry while someone is still listening.
      if (listeners.get(collection)?.size) {
        setTimeout(
          () => ensureSubscribed(collection, attempt + 1),
          Math.min(30_000, 1000 * 2 ** attempt),
        )
      }
    })
}

/** Calls `onChange` whenever any record in `collection` changes. Returns a cleanup fn. */
export function onCollectionChange(collection: string, onChange: () => void) {
  let set = listeners.get(collection)
  if (!set) {
    set = new Set()
    listeners.set(collection, set)
  }
  set.add(onChange)
  ensureSubscribed(collection)
  return () => {
    set.delete(onChange)
  }
}

// Drop the server-side subscriptions on logout; they are re-created on next use.
pb.authStore.onChange(() => {
  if (pb.authStore.isValid) return
  subscribed.clear()
  pb.realtime.unsubscribe().catch(() => {})
})
