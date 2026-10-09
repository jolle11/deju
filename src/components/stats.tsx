import { useState } from 'react'
import { useI18n } from '#/lib/preferences'
import { dayKey, lastDays, startOfDay } from '#/lib/stats'
import { capitalize, dateFormat } from '#/lib/time'

const NARROW_DAY = { weekday: 'narrow' } as const
const LONG_DAY = { weekday: 'long', day: 'numeric', month: 'short' } as const
const MONTH = { month: 'long', year: 'numeric' } as const
// Any Monday; used to label a Monday-first week in the current locale.
const A_MONDAY = new Date(2024, 0, 1)

function formatH(hours: number) {
  return `${hours.toFixed(1).replace('.0', '')}h`
}

/** Hours fasted per day (by end date) over the last 7 days. Single series. */
export function WeeklyChart({
  hoursByDay,
  goalHours,
}: {
  hoursByDay: Map<string, number>
  goalHours: number
}) {
  const { t, locale } = useI18n()
  const weekdayFmt = dateFormat(locale, NARROW_DAY)
  const dayFmt = dateFormat(locale, LONG_DAY)
  const days = lastDays(7)
  const values = days.map((d) => hoursByDay.get(dayKey(d)) ?? 0)
  const max = Math.max(24, goalHours, ...values)
  const [hover, setHover] = useState<number | null>(null)
  const active = hover ?? values.length - 1

  return (
    <figure className="rounded-2xl border border-input p-4">
      <figcaption className="flex items-baseline justify-between">
        <span className="font-display text-lg font-extrabold">{t('chart.last7')}</span>
        <span className="text-sm font-semibold text-muted-foreground tabular-nums">
          {capitalize(dayFmt.format(days[active]))} · {formatH(values[active])}
        </span>
      </figcaption>
      <div className="relative mt-4 h-36">
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-input"
          style={{ bottom: `${(goalHours / max) * 100}%` }}
        >
          <span className="absolute -top-4 right-0 text-[10px] font-bold text-muted-foreground">
            {goalHours}h
          </span>
        </div>
        <div className="absolute inset-0 flex items-end gap-[2px] border-b border-input">
          {values.map((v, i) => (
            <button
              key={dayKey(days[i])}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${dayFmt.format(days[i])}: ${formatH(v)}`}
              className="flex h-full flex-1 items-end justify-center"
            >
              <span
                className="w-3/5 rounded-t-[4px] transition-opacity"
                style={{
                  height: `${(v / max) * 100}%`,
                  minHeight: v > 0 ? 4 : 0,
                  backgroundColor: 'var(--lagoon)',
                  opacity: hover === null || hover === i ? 1 : 0.45,
                }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1 flex gap-[2px]">
        {days.map((d) => (
          <span
            key={dayKey(d)}
            className="flex-1 text-center text-xs font-bold uppercase text-muted-foreground"
          >
            {weekdayFmt.format(d)}
          </span>
        ))}
      </div>
    </figure>
  )
}

/** Month grid with days where a fast hit its target highlighted. */
export function MonthCalendar({ completedDays }: { completedDays: Set<string> }) {
  const { t, locale } = useI18n()
  const monthFmt = dateFormat(locale, MONTH)
  const weekdayFmt = dateFormat(locale, NARROW_DAY)
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(A_MONDAY)
    d.setDate(d.getDate() + i)
    return { key: i, label: weekdayFmt.format(d) }
  })
  const [offset, setOffset] = useState(0)
  const today = startOfDay(new Date())
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const leading = (first.getDay() + 6) % 7 // Monday-first
  const blanks = Array.from({ length: leading }, (_, i) => `blank-${first.getMonth()}-${i}`)
  const dates = Array.from(
    { length: daysInMonth },
    (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1),
  )

  return (
    <section className="rounded-2xl border border-input p-4">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOffset(offset - 1)}
          className="px-2 text-lg font-bold"
          aria-label={t('calendar.prev')}
        >
          ‹
        </button>
        <h2 className="font-display text-lg font-extrabold">
          {capitalize(monthFmt.format(first))}
        </h2>
        <button
          type="button"
          onClick={() => setOffset(offset + 1)}
          disabled={offset >= 0}
          className="px-2 text-lg font-bold disabled:opacity-30"
          aria-label={t('calendar.next')}
        >
          ›
        </button>
      </header>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {weekdays.map((w) => (
          <span key={w.key} className="text-xs font-bold uppercase text-muted-foreground">
            {w.label}
          </span>
        ))}
        {blanks.map((key) => (
          <span key={key} />
        ))}
        {dates.map((d) => {
          const done = completedDays.has(dayKey(d))
          const isToday = d.getTime() === today.getTime()
          return (
            <span
              key={dayKey(d)}
              className={`grid aspect-square place-items-center rounded-full text-sm font-bold tabular-nums ${
                done ? 'bg-[var(--lagoon)] text-black' : 'text-muted-foreground'
              } ${isToday && !done ? 'ring-2 ring-input' : ''}`}
            >
              {d.getDate()}
              {done && <span className="sr-only"> ({t('history.goalMet')})</span>}
            </span>
          )
        })}
      </div>
    </section>
  )
}
