import { matchPlan, PLANS, type Plan } from '#/lib/plans'
import { useI18n } from '#/lib/preferences'

/** Preset schedules; picking one sets both the goal and the eating window. */
export function PlanPicker({
  fastHours,
  windowHours,
  onPick,
}: {
  fastHours: number
  windowHours: number
  onPick: (plan: Plan) => void
}) {
  const { t } = useI18n()
  const current = matchPlan(fastHours, windowHours)
  return (
    <div className="grid grid-cols-3 gap-2">
      {PLANS.map((p) => {
        const selected = current?.id === p.id
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onPick(p)}
            className={`flex flex-col items-center rounded-xl border px-2 py-2 ${
              selected ? 'border-[var(--lagoon)] bg-[var(--lagoon)]/10' : 'border-input'
            }`}
          >
            <span className="font-display text-lg font-extrabold">
              {p.id === 'omad' ? 'OMAD' : p.id}
            </span>
            <span className="text-[0.7rem] font-semibold text-muted-foreground">
              {t('plans.detail', { f: p.fastHours, w: p.windowHours })}
            </span>
          </button>
        )
      })}
      <span
        className={`flex items-center justify-center rounded-xl border border-dashed px-2 py-2 text-center text-sm font-bold ${
          current ? 'border-input text-muted-foreground' : 'border-[var(--lagoon)]'
        }`}
      >
        {t('plans.custom')}
      </span>
    </div>
  )
}
