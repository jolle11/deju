import { Check, ChevronDown } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

type Option<T> = { value: T; label: string; leading?: ReactNode }

/** Full-width dropdown matching the app's menus (see QuickPrefs). */
export function Select<T extends string | number>({
  options,
  value,
  onChange,
  label,
  leading,
}: {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  label?: string
  /** Shown in the field before the text, e.g. a color swatch. */
  leading?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const current = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    listRef.current?.focus({ preventScroll: true })
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  function show() {
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    )
    setOpen(true)
  }

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function pick(option: Option<T>) {
    if (option.value !== value) onChange(option.value)
    close()
  }

  function onListKey(e: React.KeyboardEvent) {
    const last = options.length - 1
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive((i) => (i >= last ? 0 : i + 1)),
      ArrowUp: () => setActive((i) => (i <= 0 ? last : i - 1)),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => pick(options[active]),
      ' ': () => pick(options[active]),
      Escape: close,
      Tab: () => setOpen(false),
    }
    const action = keys[e.key]
    if (!action) return
    if (e.key !== 'Tab') e.preventDefault()
    action()
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            show()
          }
        }}
        className={`flex w-full items-center gap-3 rounded-xl border border-input px-3 py-2.5 text-base font-bold transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${open ? 'bg-muted/60' : ''}`}
      >
        {leading ?? current.leading}
        <span className="flex-1 text-left">{current.label}</span>
        <ChevronDown
          className={`size-5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
          className="absolute inset-x-0 z-50 mt-1.5 max-h-72 origin-top animate-in overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none fade-in-0 zoom-in-95"
        >
          {options.map((option, i) => {
            const selected = option.value === value
            return (
              // Keyboard handling lives on the listbox (aria-activedescendant).
              // biome-ignore lint/a11y/useKeyWithClickEvents: see above
              <div
                key={String(option.value)}
                tabIndex={-1}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(option)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-base ${i === active ? 'bg-muted' : ''} ${selected ? 'font-bold' : ''}`}
              >
                {option.leading}
                <span className="flex-1">{option.label}</span>
                <Check
                  className={`size-4 ${selected ? 'text-foreground' : 'invisible'}`}
                  aria-hidden="true"
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
