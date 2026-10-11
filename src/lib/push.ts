import { currentUserId, pb } from './pb'

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

/** Thrown when the user declines notifications; callers show a translated message. */
export class PushPermissionError extends Error {}

export function pushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(vapidPublicKey)
  )
}

/**
 * Reminders are only delivered to phones, tablets and installed apps, so a
 * desktop browser tab never gets the setting.
 */
export function pushRelevant() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean(navigator.standalone))
  )
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function getPushSubscription() {
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function enablePush() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new PushPermissionError()

  const reg = await navigator.serviceWorker.ready
  let sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }))

  const existing = await findRecord(sub.endpoint)
  if (existing) return

  try {
    await saveSubscription(sub)
  } catch {
    // The endpoint is still registered to another account that used this
    // device; a fresh subscription gets a new endpoint we can own.
    await sub.unsubscribe()
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
    await saveSubscription(sub)
  }
}

function findRecord(endpoint: string) {
  return pb
    .collection('push_subscriptions')
    .getFirstListItem(pb.filter('endpoint = {:endpoint}', { endpoint }))
    .catch(() => null)
}

function saveSubscription(sub: PushSubscription) {
  const json = sub.toJSON()
  return pb.collection('push_subscriptions').create({
    user: currentUserId(),
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    userAgent: navigator.userAgent,
  })
}

export async function disablePush() {
  const sub = await getPushSubscription()
  if (!sub) return
  const existing = await findRecord(sub.endpoint)
  if (existing) await pb.collection('push_subscriptions').delete(existing.id)
  await sub.unsubscribe()
}

/**
 * Stops this device from receiving the current user's reminders. Must run
 * while still authenticated so the server record can be deleted.
 */
export async function clearPushOnLogout() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  const existing = await findRecord(sub.endpoint)
  if (existing)
    await pb
      .collection('push_subscriptions')
      .delete(existing.id)
      .catch(() => {})
  await sub.unsubscribe().catch(() => {})
}
