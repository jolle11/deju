import { useState } from 'react'
import { Select } from '#/components/select'
import { useI18n } from '#/lib/preferences'

const GOAL_OPTIONS = [12, 13, 14, 16, 18, 20, 24, 36]
/** Sentinel option value for "custom". */
const CUSTOM = -1

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
      <Select
        label={t('settings.goal')}
        options={[
          ...GOAL_OPTIONS.map((h) => ({ value: h, label: `${h}h` })),
          { value: CUSTOM, label: t('settings.goal.custom') },
        ]}
        value={custom ? CUSTOM : value}
        onChange={(h) => {
          if (h === CUSTOM) return setCustom(true)
          setCustom(false)
          setDraft(String(h))
          onChange(h)
        }}
      />
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
