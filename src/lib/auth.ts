import { pb } from './pb'
import { clearPushOnLogout } from './push'

/** Signs out after detaching this device from the user's push reminders. */
export async function logout() {
  // Best effort: never block logging out on a flaky push service.
  await clearPushOnLogout().catch(() => {})
  pb.authStore.clear()
}

const REFRESH_EVERY_MS = 10 * 60_000
let lastRefresh = 0

/**
 * Renews the token and reloads the user record, so preferences changed on
 * another device show up here. A rejected session signs the user out.
 */
export async function refreshSession(force = false) {
  if (!pb.authStore.isValid) return
  if (!force && Date.now() - lastRefresh < REFRESH_EVERY_MS) return
  lastRefresh = Date.now()
  try {
    await pb.collection('users').authRefresh({ requestKey: null })
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status === 401 || status === 403 || status === 404) {
      pb.authStore.clear()
      window.location.assign('/welcome')
    }
  }
}
