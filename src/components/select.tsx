import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

/** Native dropdown: compact, and opens the system picker on mobile. */
export function Select<T extends string | number>({
  options,
  value,
  onChange,
  label,
  leading,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label?: string
  /** Shown inside the field before the text, e.g. a color swatch. */
  leading?: ReactNode
}) {
  return (
    <div className="relative flex items-center">
      {leading && (
        <span className="pointer-events-none absolute left-3 flex items-center">{leading}</span>
      )}
      <select
        aria-label={label}
        value={String(value)}
        onChange={(e) => {
          const picked = options.find((o) => String(o.value) === e.target.value)
          if (picked) onChange(picked.value)
        }}
        className={`w-full appearance-none rounded-xl border border-input bg-transparent py-2.5 pr-10 text-base font-bold ${
          leading ? 'pl-12' : 'pl-4'
        }`}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 size-5 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  )
}
