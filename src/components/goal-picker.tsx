import { useState } from 'react'
import { useI18n } from '#/lib/preferences'

const GOAL_OPTIONS = [12, 13, 14, 16, 18, 20, 24, 36]

export function GoalPicker({ value, onChange }: { value: number; onChange: (h: number) => void }) {
  const { t } = useI18n()
  const isPreset = GOAL_OPTIONS.includes(value)
  const [custom, setCustom] = useState(!isPreset)
  const [draft, setDraft] = useState(String(value))

  function commit() {
    const h = Math.round(Number(draft))
    if (h >= 1 && h <= 168 && h !== value) onChange(h)
    else setDraft(String(value))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {GOAL_OPTIONS.map((h) => {
          const selected = !custom && h === value
          return (
            // biome-ignore lint/a11y/useSemanticElements: styled chip group
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setCustom(false)
                setDraft(String(h))
                onChange(h)
              }}
              className={`rounded-full border px-4 py-1.5 text-sm font-bold ${
                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
              }`}
            >
              {h}h
            </button>
          )
        })}
        {/* biome-ignore lint/a11y/useSemanticElements: styled chip group */}
        <button
          type="button"
          role="radio"
          aria-checked={custom}
          onClick={() => setCustom(true)}
          className={`rounded-full border px-4 py-1.5 text-sm font-bold ${
            custom ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
          }`}
        >
          {t('settings.goal.custom')}
        </button>
      </div>
      {custom && (
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="number"
            min={1}
            max={168}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            className="w-24 rounded-xl border border-input bg-transparent px-3 py-2 text-center text-base"
          />
          {t('settings.goal.hours')}
        </label>
      )}
    </div>
  )
}
