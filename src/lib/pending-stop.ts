import { currentUserId, fasts, USER_CACHE_PREFIX } from './pb'

/** An end time that could not reach the server yet (offline). */
export type PendingStop = { id: string; endedAt: string }

const pendingStopKey = () => `${USER_CACHE_PREFIX}pending-stop:${currentUserId()}`

export function readPendingStop(): PendingStop | null {
  try {
    return JSON.parse(localStorage.getItem(pendingStopKey()) ?? 'null')
  } catch {
    return null
  }
}

export function writePendingStop(pending: PendingStop | null) {
  if (pending) localStorage.setItem(pendingStopKey(), JSON.stringify(pending))
  else localStorage.removeItem(pendingStopKey())
}

/** PocketBase reports network failures (offline, aborted) as status 0. */
export const isNetworkError = (err: unknown) => (err as { status?: number }).status === 0

/** Sends a queued end time. Only network failures keep it queued. */
export async function flushPendingStop() {
  const pending = readPendingStop()
  if (!pending) return
  try {
    await fasts().update(pending.id, { endedAt: pending.endedAt }, { requestKey: null })
    writePendingStop(null)
  } catch (err) {
    if (!isNetworkError(err)) writePendingStop(null)
  }
}
