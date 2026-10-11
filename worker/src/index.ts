import PocketBase, { ClientResponseError } from 'pocketbase'
import webpush from 'web-push'
import { env } from './env.ts'
import { TEXTS, toLocale } from './i18n.ts'
import { reachedMilestones } from './milestones.ts'

type Fast = {
  id: string
  user: string
  startedAt: string
  targetHours: number
  expand?: { user?: { locale?: string } }
}
type PushSub = { id: string; endpoint: string; p256dh: string; auth: string }
type LogEntry = { fast: string; kind: string }
type User = { id: string; eatingWindowHours: number; locale: string }
type EndedFast = { id: string; user: string; endedAt: string }

/** Longest eating window allowed by the users collection. */
const MAX_EATING_WINDOW_HOURS = 24
/** Reminders older than this are skipped (e.g. the worker was down). */
const STALE_REMINDER_MS = 6 * 3_600_000

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
  const active = await pb.collection('fasts').getFullList<Fast>({
    filter: 'endedAt = ""',
    expand: 'user',
    fields: 'id,user,startedAt,targetHours,expand.user.locale',
  })

  // Every log entry of the running fasts in one query instead of one per fast.
  const logs = await pb.collection('notification_log').getFullList<LogEntry>({
    filter: 'fast.endedAt = ""',
    fields: 'fast,kind',
  })
  const sentByFast = new Map<string, Set<string>>()
  for (const log of logs) {
    const kinds = sentByFast.get(log.fast) ?? new Set()
    kinds.add(log.kind)
    sentByFast.set(log.fast, kinds)
  }

  for (const fast of active) {
    const locale = toLocale(fast.expand?.user?.locale)
    const reached = reachedMilestones(new Date(fast.startedAt), fast.targetHours, now, locale)
    if (reached.length === 0) continue

    const sentKinds = sentByFast.get(fast.id)
    const pending = reached.filter((m) => !sentKinds?.has(m.kind))
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

  await remindNextFast(now, new Set(active.map((f) => f.user)))
}

/** Nudges users with an eating window to start their next fast. */
async function remindNextFast(now: Date, fasting: Set<string>) {
  const users = await pb
    .collection('users')
    .getFullList<User>({ filter: 'eatingWindowHours > 0', fields: 'id,eatingWindowHours,locale' })
  if (users.length === 0) return

  // Only fasts ending recently can still be due: anything older is stale even
  // with the longest window. One query covers every user.
  const since = new Date(now.getTime() - MAX_EATING_WINDOW_HOURS * 3_600_000 - STALE_REMINDER_MS)
  const recent = await pb.collection('fasts').getFullList<EndedFast>({
    filter: pb.filter('endedAt != "" && endedAt >= {:since}', { since }),
    sort: 'endedAt',
    fields: 'id,user,endedAt',
  })
  const lastByUser = new Map(recent.map((f) => [f.user, f]))

  for (const user of users) {
    // A fast is already running: nothing to remind.
    if (fasting.has(user.id)) continue
    const last = lastByUser.get(user.id)
    if (!last) continue

    const dueAt = new Date(last.endedAt).getTime() + user.eatingWindowHours * 3_600_000
    if (now.getTime() < dueAt || now.getTime() - dueAt > STALE_REMINDER_MS) continue

    if (await claim(last.id, 'next-fast')) {
      await sendToUser(user.id, {
        title: TEXTS[toLocale(user.locale)].nextTitle,
        body: TEXTS[toLocale(user.locale)].nextBody(user.eatingWindowHours),
        tag: `next-${last.id}`,
        url: '/',
      })
      console.log(`sent next-fast reminder for user ${user.id}`)
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
