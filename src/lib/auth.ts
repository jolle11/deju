import { pb } from './pb'
import { clearPushOnLogout } from './push'

/** Signs out after detaching this device from the user's push reminders. */
export async function logout() {
  // Best effort: never block logging out on a flaky push service.
  await clearPushOnLogout().catch(() => {})
  pb.authStore.clear()
}
