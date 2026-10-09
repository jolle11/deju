import { currentUserId, pb } from './pb'

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function pushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(vapidPublicKey)
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
  if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado')

  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }))

  const json = sub.toJSON()
  const existing = await pb
    .collection('push_subscriptions')
    .getFirstListItem(pb.filter('endpoint = {:endpoint}', { endpoint: sub.endpoint }))
    .catch(() => null)
  if (existing) return

  await pb.collection('push_subscriptions').create({
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
  const existing = await pb
    .collection('push_subscriptions')
    .getFirstListItem(pb.filter('endpoint = {:endpoint}', { endpoint: sub.endpoint }))
    .catch(() => null)
  if (existing) await pb.collection('push_subscriptions').delete(existing.id)
  await sub.unsubscribe()
}
