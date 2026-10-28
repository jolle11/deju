import { Trash2 } from 'lucide-react'
import type { RecordSubscription } from 'pocketbase'
import { useEffect, useState } from 'react'
import { weightTrend } from '#/lib/body'
import { applyEvent, onCollectionChange } from '#/lib/live'
import { currentUserId, type Measurement, measurements } from '#/lib/pb'
import { useI18n } from '#/lib/preferences'
import { capitalize, dateFormat, fromLocalInput, toLocalInput } from '#/lib/time'

const newestFirst = (a: Measurement, b: Measurement) => b.date.localeCompare(a.date)
const keepAll = () => true

/** Entries listed at a time; the chart always uses all of them. */
const VISIBLE = 10

function useMeasurements() {
  const [items, setItems] = useState<Measurement[] | null>(null)
  useEffect(() => {
    measurements()
      .getFullList({ sort: '-date', requestKey: null })
      .then(setItems)
      .catch(() => setItems([]))
    return onCollectionChange('measurements', (event) =>
      setItems((list) =>
        list
          ? applyEvent(list, event as RecordSubscription<Measurement>, keepAll, newestFirst)
          : list,
      ),
    )
  }, [])
  return items
}

const formatKg = (kg: number) => `${Number(kg.toFixed(1))}`

/** Optional weight and waist log, shown only when body tracking is on. */
export function BodySection() {
  const { t, locale } = useI18n()
  const items = useMeasurements()
  const [date, setDate] = useState(() => toLocalInput(Date.now()))
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const dayFmt = dateFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const weightKg = Number(weight.replace(',', '.')) || 0
    const waistCm = Number(waist.replace(',', '.')) || 0
    if (!weightKg && !waistCm) return setError(t('body.needValue'))
    if (new Date(date).getTime() > Date.now() + 60_000) return setError(t('body.future'))
    setBusy(true)
    setError(null)
    try {
      await measurements().create({
        user: currentUserId(),
        date: fromLocalInput(date),
        weightKg,
        waistCm,
      })
      setWeight('')
      setWaist('')
      setDate(toLocalInput(Date.now()))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.saveError'))
    } finally {
      setBusy(false)
    }
  }

  const { points, change } = weightTrend(items ?? [])
  const input =
    'w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm font-semibold'

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-input p-4">
      <header className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-extrabold">{t('body.title')}</h2>
        {change !== null && (
          <span className="text-sm font-semibold text-muted-foreground tabular-nums">
            {t('body.change', { v: `${change > 0 ? '+' : ''}${formatKg(change)}` })}
          </span>
        )}
      </header>

      {points.length > 1 && <WeightChart kgs={points.map((p) => p.kg)} />}

      <form onSubmit={add} className="grid grid-cols-2 gap-2">
        <label className="col-span-2 flex flex-col gap-1 text-xs font-bold text-muted-foreground">
          {t('body.date')}
          <input
            type="datetime-local"
            value={date}
            max={toLocalInput(Date.now())}
            onChange={(e) => setDate(e.target.value)}
            required
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
          {t('body.weight')}
          <input
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
          {t('body.waist')}
          <input
            inputMode="decimal"
            value={waist}
            onChange={(e) => setWaist(e.target.value)}
            className={input}
          />
        </label>
        {error && (
          <p role="alert" className="col-span-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="col-span-2 rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground disabled:opacity-50"
        >
          {t('body.add')}
        </button>
      </form>

      {items && items.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('body.empty')}</p>
      )}
      <ul className="flex flex-col divide-y divide-input">
        {(items ?? []).slice(0, VISIBLE).map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="flex-1 font-semibold text-muted-foreground">
              {capitalize(dayFmt.format(new Date(m.date)))}
            </span>
            <span className="font-bold tabular-nums">
              {[m.weightKg ? `${formatKg(m.weightKg)} kg` : '', m.waistCm ? `${m.waistCm} cm` : '']
                .filter(Boolean)
                .join(' · ')}
            </span>
            <button
              type="button"
              onClick={() =>
                measurements()
                  .delete(m.id)
                  .catch(() => {})
              }
              aria-label={t('body.delete')}
              className="text-muted-foreground"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Weight over time as a simple line, scaled to its own range. */
function WeightChart({ kgs }: { kgs: number[] }) {
  const min = Math.min(...kgs)
  const max = Math.max(...kgs)
  const span = max - min || 1
  const path = kgs
    .map((kg, i) => {
      const x = (i / (kgs.length - 1)) * 100
      const y = 36 - ((kg - min) / span) * 32
      return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
  return (
    <div className="flex items-stretch gap-2">
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-20 flex-1"
        aria-hidden="true"
      >
        <path
          d={path}
          fill="none"
          stroke="var(--lagoon)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="flex flex-col justify-between text-[10px] font-bold text-muted-foreground tabular-nums">
        <span>{formatKg(max)}</span>
        <span>{formatKg(min)}</span>
      </span>
    </div>
  )
}
