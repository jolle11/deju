import PocketBase, { ClientResponseError } from 'pocketbase'
import webpush from 'web-push'
import { env } from './env.ts'
import { reachedMilestones } from './milestones.ts'

type Fast = { id: string; user: string; startedAt: string; targetHours: number }
type PushSub = { id: string; endpoint: string; p256dh: string; auth: string }
type LogEntry = { kind: string }

webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey)

const pb = new PocketBase(env.pbUrl)
pb.autoCancellation(false)

async function ensureAuth() {
  if (pb.authStore.isValid) return
  await pb.collection('_superusers').authWithPassword(env.pbEmail, env.pbPassword)
}

async function sendToUser(userId: string, payload: object) {
  const subs = await pb
    .collection('push_subscriptions')
    .getFullList<PushSub>({ filter: pb.filter('user = {:userId}', { userId }) })

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 },
        )
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await pb.collection('push_subscriptions').delete(sub.id)
        } else {
          console.error(`push failed for ${sub.id}`, err)
        }
      }
    }),
  )
}

/** Claims a milestone via the unique (fast, kind) index; false if already claimed. */
async function claim(fastId: string, kind: string) {
  try {
    await pb.collection('notification_log').create({ fast: fastId, kind })
    return true
  } catch (err) {
    if (err instanceof ClientResponseError && err.status === 400) return false
    throw err
  }
}

async function tick() {
  await ensureAuth()
  const now = new Date()
  const active = await pb
    .collection('fasts')
    .getFullList<Fast>({ filter: 'endedAt = ""' })

  for (const fast of active) {
    const reached = reachedMilestones(new Date(fast.startedAt), fast.targetHours, now)
    if (reached.length === 0) continue

    const sent = await pb.collection('notification_log').getFullList<LogEntry>({
      filter: pb.filter('fast = {:id}', { id: fast.id }),
      fields: 'kind',
    })
    const sentKinds = new Set(sent.map((s) => s.kind))
    const pending = reached.filter((m) => !sentKinds.has(m.kind))
    if (pending.length === 0) continue

    // Mark everything as handled but only notify the newest one,
    // so a worker restart doesn't flood the user with stale alerts.
    const newest = pending[pending.length - 1]
    for (const m of pending) {
      const claimed = await claim(fast.id, m.kind)
      if (claimed && m === newest) {
        await sendToUser(fast.user, {
          title: m.title,
          body: m.body,
          tag: `fast-${fast.id}`,
          url: '/',
        })
        console.log(`sent ${m.kind} for fast ${fast.id}`)
      }
    }
  }
}

let running = true
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    running = false
  })
}

console.log(`notif-worker polling ${env.pbUrl} every ${env.pollIntervalMs / 1000}s`)
while (running) {
  try {
    await tick()
  } catch (err) {
    console.error('tick failed', err)
    pb.authStore.clear()
  }
  await new Promise((r) => setTimeout(r, env.pollIntervalMs))
}
