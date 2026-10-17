import { useState } from 'react'
import type { MessageKey } from '#/lib/messages'
import type { Fast } from '#/lib/pb'
import { useI18n } from '#/lib/preferences'
import { monthComparison, type PeriodSummary, weeklyCompletion } from '#/lib/stats'
import { dateFormat } from '#/lib/time'

const WEEKS = 8
const SHORT_DATE = { day: 'numeric', month: 'short' } as const

function formatH(ms: number) {
  return `${(ms / 3_600_000).toFixed(1).replace('.0', '')}h`
}

function formatRate(rate: number | null) {
  return rate === null ? '–' : `${Math.round(rate * 100)}%`
}

/** This month's figures, each with last month's value underneath for reference. */
export function MonthComparison({ items }: { items: Fast[] }) {
  const { t } = useI18n()
  const { current, previous } = monthComparison(items)
  const tiles: { label: MessageKey; value: (p: PeriodSummary) => string }[] = [
    { label: 'periods.fasts', value: (p) => String(p.count) },
    { label: 'periods.rate', value: (p) => formatRate(p.rate) },
    { label: 'periods.average', value: (p) => (p.count ? formatH(p.averageMs) : '–') },
    { label: 'periods.total', value: (p) => `${Math.round(p.totalMs / 3_600_000)}h` },
  ]

  return (
    <section className="rounded-2xl border border-input p-4">
      <h2 className="font-display text-lg font-extrabold">{t('periods.title')}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {tiles.map(({ label, value }) => (
          <div key={label} className="flex flex-col">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t(label)}
            </dt>
            <dd className="font-display text-2xl font-extrabold tabular-nums">{value(current)}</dd>
            <dd className="whitespace-nowrap text-xs font-semibold text-muted-foreground tabular-nums">
              {t('periods.prev', { v: value(previous) })}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

type Bar = {
  key: string
  /** Short axis label under the bar */
  axis: string
  /** 0..1 of the plot height */
  ratio: number
  /** Full description, shown in the header on hover and read by screen readers */
  detail: string
}

/**
 * Single-series bar chart in the same style as the weekly hours chart: the
 * header shows the hovered (or last) bar, every bar is a focusable target.
 */
function BarChart({ title, bars }: { title: string; bars: Bar[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const active = bars[hover ?? bars.length - 1]

  return (
    <figure className="rounded-2xl border border-input p-4">
      <figcaption className="flex flex-col gap-0.5">
        <span className="font-display text-lg font-extrabold">{title}</span>
        <span className="text-sm font-semibold text-muted-foreground tabular-nums">
          {active.detail}
        </span>
      </figcaption>
      <div className="mt-4 flex h-28 items-end gap-[2px] border-b border-input">
        {bars.map((bar, i) => (
          <button
            key={bar.key}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-label={bar.detail}
            className="flex h-full flex-1 items-end justify-center"
          >
            <span
              className="w-3/5 rounded-t-[4px] transition-opacity"
              style={{
                height: `${bar.ratio * 100}%`,
                minHeight: bar.ratio > 0 ? 4 : 0,
                backgroundColor: 'var(--lagoon)',
                opacity: hover === null || hover === i ? 1 : 0.45,
              }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {bars.map((bar) => (
          <span
            key={bar.key}
            className="flex-1 text-center text-xs font-bold text-muted-foreground tabular-nums"
          >
            {bar.axis}
          </span>
        ))}
      </div>
    </figure>
  )
}

/** Share of fasts that met their goal, per week, over the last WEEKS weeks. */
export function WeeklyCompletionChart({ items }: { items: Fast[] }) {
  const { t, locale } = useI18n()
  const fmt = dateFormat(locale, SHORT_DATE)
  const bars = weeklyCompletion(items, WEEKS).map((w) => {
    const week = t('periods.weekOf', { date: fmt.format(w.weekStart) })
    return {
      key: w.weekStart.toISOString(),
      axis: String(w.weekStart.getDate()),
      ratio: w.rate ?? 0,
      detail: `${week} · ${
        w.count
          ? `${formatRate(w.rate)} (${t('periods.weekValue', { done: w.completed, total: w.count })})`
          : t('periods.noFasts')
      }`,
    }
  })
  return <BarChart title={t('periods.weekly')} bars={bars} />
}
