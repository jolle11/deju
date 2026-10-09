import { useEffect, useState } from 'react'
import { WeightChart } from '#/components/weight-chart'
import { onCollectionChange } from '#/lib/live'
import { currentUserId, type Weight, weights } from '#/lib/pb'
import { useI18n } from '#/lib/preferences'
import { formatDate, fromLocalInput, toLocalInput } from '#/lib/time'

function useWeights() {
  const [items, setItems] = useState<Weight[]>([])

  useEffect(() => {
    const load = () =>
      weights()
        .getFullList({ sort: 'measuredAt', requestKey: null })
        .then(setItems)
        .catch(() => setItems([]))

    load()
    return onCollectionChange('weights', load)
  }, [])

  return items
}

export function WeightSection() {
  const { t, locale } = useI18n()
  const items = useWeights()
  const [kg, setKg] = useState('')
  const [measuredAt, setMeasuredAt] = useState(() => toLocalInput(Date.now()))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const latest = items[items.length - 1]
  const first = items[0]
  const delta = latest && first && items.length > 1 ? latest.kg - first.kg : null

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(kg.replace(',', '.'))
    if (!(value >= 20 && value <= 400)) return setError(t('weight.invalid'))
    setBusy(true)
    setError(null)
    try {
      await weights().create({
        user: currentUserId(),
        kg: Math.round(value * 10) / 10,
        measuredAt: fromLocalInput(measuredAt),
      })
      setKg('')
      setMeasuredAt(toLocalInput(Date.now()))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.saveError'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(w: Weight) {
    if (confirm(t('weight.confirmDelete', { kg: w.kg, date: formatDate(w.measuredAt, locale) })))
      await weights().delete(w.id)
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-input p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-extrabold">{t('weight.title')}</h2>
        {latest && (
          <span className="font-display text-2xl font-extrabold tabular-nums">
            {latest.kg} kg
            {delta !== null && (
              <span className="ml-2 text-sm font-bold text-muted-foreground">
                {delta > 0 ? '+' : ''}
                {delta.toFixed(1)}
              </span>
            )}
          </span>
        )}
      </div>

      <WeightChart entries={items} />

      <form onSubmit={add} className="flex flex-col gap-2">
        <input
          type="datetime-local"
          value={measuredAt}
          max={toLocalInput(Date.now())}
          onChange={(e) => setMeasuredAt(e.target.value)}
          aria-label={t('weight.date')}
          className="rounded-xl border border-input bg-transparent px-3 py-2.5 text-base"
        />
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder={t('weight.placeholder')}
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            aria-label={t('weight.placeholder')}
            className="min-w-0 flex-1 rounded-xl border border-input bg-transparent px-3 py-2.5 text-base"
          />
          <button
            type="submit"
            disabled={busy || !kg}
            className="rounded-full bg-primary px-5 font-bold text-primary-foreground disabled:opacity-50"
          >
            {t('weight.add')}
          </button>
        </div>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {items.length > 0 && (
        <ul className="flex flex-col divide-y divide-input">
          {[...items]
            .reverse()
            .slice(0, 5)
            .map((w) => (
              <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">{formatDate(w.measuredAt, locale)}</span>
                <span className="flex items-center gap-3">
                  <span className="font-bold tabular-nums">{w.kg} kg</span>
                  <button
                    type="button"
                    onClick={() => remove(w)}
                    aria-label={t('common.delete')}
                    className="text-muted-foreground"
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
        </ul>
      )}
    </section>
  )
}
