import type { Fast } from '#/lib/pb'

const DAY = 86_400_000

export function durationMs(f: Fast) {
  return new Date(f.endedAt).getTime() - new Date(f.startedAt).getTime()
}

export function isCompleted(f: Fast) {
  return durationMs(f) >= f.targetHours * 3_600_000
}

/** Local calendar day key, e.g. "2026-10-09". Fasts count on the day they end. */
export function dayKey(date: Date | string | number) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function startOfDay(date: Date | number) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function computeStats(items: Fast[], now = new Date()) {
  const completedDays = new Set(items.filter(isCompleted).map((f) => dayKey(f.endedAt)))
  const hoursByDay = new Map<string, number>()
  for (const f of items) {
    const key = dayKey(f.endedAt)
    hoursByDay.set(key, (hoursByDay.get(key) ?? 0) + durationMs(f) / 3_600_000)
  }

  // Current streak: today counts if done, otherwise start from yesterday.
  let cursor = startOfDay(now)
  if (!completedDays.has(dayKey(cursor))) cursor = addDays(cursor, -1)
  let streak = 0
  while (completedDays.has(dayKey(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }

  let bestStreak = 0
  let run = 0
  let prev: number | null = null
  for (const key of [...completedDays].sort()) {
    const t = new Date(`${key}T00:00:00`).getTime()
    run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1
    bestStreak = Math.max(bestStreak, run)
    prev = t
  }

  const totalMs = items.reduce((sum, f) => sum + durationMs(f), 0)

  return {
    total: items.length,
    completed: items.filter(isCompleted).length,
    longestMs: items.reduce((max, f) => Math.max(max, durationMs(f)), 0),
    totalMs,
    averageMs: items.length ? totalMs / items.length : 0,
    streak,
    bestStreak,
    completedDays,
    hoursByDay,
  }
}

export function lastDays(n: number, now = new Date()) {
  const today = startOfDay(now)
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1))
}
