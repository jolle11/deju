import type { Fast } from '#/lib/pb'

const DAY = 86_400_000

export function durationMs(f: Fast) {
  return new Date(f.endedAt).getTime() - new Date(f.startedAt).getTime()
}

/** A fast of at least this many hours counts as done, even if it missed its goal. */
export const MIN_FAST_HOURS = 12

/** "goal" = reached its own target; "min" = at least MIN_FAST_HOURS. */
export type DayLevel = 'goal' | 'min'

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
  const dayLevels = new Map<string, DayLevel>()
  for (const f of items) {
    const key = dayKey(f.endedAt)
    if (isCompleted(f)) dayLevels.set(key, 'goal')
    else if (durationMs(f) >= MIN_FAST_HOURS * 3_600_000 && !dayLevels.has(key))
      dayLevels.set(key, 'min')
  }
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
    dayLevels,
    hoursByDay,
  }
}

export function lastDays(n: number, now = new Date()) {
  const today = startOfDay(now)
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1))
}

export type PeriodSummary = {
  count: number
  completed: number
  /** 0..1, or null with no fasts */
  rate: number | null
  totalMs: number
  averageMs: number
}

/** Fasts that ended in [from, to). */
export function summarizePeriod(items: Fast[], from: Date, to: Date): PeriodSummary {
  const inPeriod = items.filter((f) => {
    const end = new Date(f.endedAt).getTime()
    return end >= from.getTime() && end < to.getTime()
  })
  const completed = inPeriod.filter(isCompleted).length
  const totalMs = inPeriod.reduce((sum, f) => sum + durationMs(f), 0)
  return {
    count: inPeriod.length,
    completed,
    rate: inPeriod.length ? completed / inPeriod.length : null,
    totalMs,
    averageMs: inPeriod.length ? totalMs / inPeriod.length : 0,
  }
}

/** This calendar month so far and the whole previous month. */
export function monthComparison(items: Fast[], now = new Date()) {
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return {
    current: summarizePeriod(items, thisMonth, nextMonth),
    previous: summarizePeriod(items, lastMonth, thisMonth),
  }
}

/** Monday of the week containing `date`, at local midnight. */
export function startOfWeek(date: Date | number) {
  const d = startOfDay(date)
  return addDays(d, -((d.getDay() + 6) % 7))
}

/** Goal completion per Monday-first week, oldest first, ending with the current week. */
export function weeklyCompletion(items: Fast[], weeks: number, now = new Date()) {
  const current = startOfWeek(now)
  return Array.from({ length: weeks }, (_, i) => {
    const from = addDays(current, (i - weeks + 1) * 7)
    return { weekStart: from, ...summarizePeriod(items, from, addDays(from, 7)) }
  })
}

/** Average duration of the fasts given each rating (1..5); unrated ones are left out. */
export function durationByRating(items: Fast[]) {
  return [1, 2, 3, 4, 5].map((rating) => {
    const rated = items.filter((f) => f.rating === rating)
    const totalMs = rated.reduce((sum, f) => sum + durationMs(f), 0)
    return { rating, count: rated.length, averageMs: rated.length ? totalMs / rated.length : 0 }
  })
}
