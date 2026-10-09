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
type LogEntry = { kind: string }
type User = { id: string; eatingWindowHours: number; locale: string }
type EndedFast = { id: string; endedAt: string }

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

  for (const fast of active) {
    const locale = toLocale(fast.expand?.user?.locale)
    const reached = reachedMilestones(new Date(fast.startedAt), fast.targetHours, now, locale)
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

  await remindNextFast(now)
}

/** Nudges users with an eating window to start their next fast. */
async function remindNextFast(now: Date) {
  const users = await pb
    .collection('users')
    .getFullList<User>({ filter: 'eatingWindowHours > 0', fields: 'id,eatingWindowHours,locale' })

  for (const user of users) {
    const latest = (filter: string, sort: string) =>
      pb
        .collection('fasts')
        .getList<EndedFast>(1, 1, {
          filter: pb.filter(`user = {:id} && ${filter}`, { id: user.id }),
          sort,
          fields: 'id,endedAt',
        })
        .then((r) => r.items[0])

    // A fast is already running: nothing to remind.
    if (await latest('endedAt = ""', '-startedAt')) continue
    const last = await latest('endedAt != ""', '-endedAt')
    if (!last) continue

    const dueAt = new Date(last.endedAt).getTime() + user.eatingWindowHours * 3_600_000
    // Skip if due long ago (e.g. worker was down), to avoid stale nudges.
    if (now.getTime() < dueAt || now.getTime() - dueAt > 6 * 3_600_000) continue

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
