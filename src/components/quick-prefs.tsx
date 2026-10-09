import { Check, ChevronDown, Languages, Monitor, Moon, Sun } from 'lucide-react'
import { type ComponentType, useEffect, useId, useRef, useState } from 'react'
import { LOCALE_NAMES, LOCALES } from '#/lib/messages'
import {
  type Prefs,
  THEMES,
  type ThemePref,
  updatePrefs,
  useI18n,
  usePrefs,
} from '#/lib/preferences'

const THEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const

type Icon = ComponentType<{ className?: string }>
type Option<T extends string> = { value: T; label: string; icon?: Icon }

/**
 * Compact theme + language controls available on every screen. The full
 * pickers still live in Settings.
 */
export function QuickPrefs({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  const prefs = usePrefs()

  function save(patch: Partial<Prefs>) {
    // Failures roll back inside updatePrefs; nothing else to surface here.
    updatePrefs(patch).catch(() => {})
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Dropdown
        label={t('settings.language')}
        icon={Languages}
        value={prefs.language}
        onChange={(language) => save({ language })}
        options={[
          { value: '' as Prefs['language'], label: t('settings.language.auto') },
          ...LOCALES.map((l) => ({ value: l as Prefs['language'], label: LOCALE_NAMES[l] })),
        ]}
      />
      <Dropdown
        label={t('settings.theme')}
        icon={THEME_ICON[prefs.theme]}
        value={prefs.theme}
        onChange={(theme: ThemePref) => save({ theme })}
        options={THEMES.map((theme) => ({
          value: theme,
          label: t(`settings.theme.${theme}`),
          icon: THEME_ICON[theme],
        }))}
      />
    </div>
  )
}

function Dropdown<T extends string>({
  label,
  icon: TriggerIcon,
  value,
  options,
  onChange,
}: {
  label: string
  icon: Icon
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
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
    listRef.current?.focus()
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
        className={`flex items-center gap-1.5 rounded-full border border-input p-2 text-sm lg:py-1.5 lg:px-2.5 font-bold text-foreground transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${open ? 'bg-muted/60' : ''}`}
      >
        <TriggerIcon className="size-4 text-muted-foreground" />
        <span className="hidden lg:inline">{current.label}</span>
        <ChevronDown
          className={`hidden size-3.5 text-muted-foreground transition-transform lg:block ${open ? 'rotate-180' : ''}`}
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
          className="absolute right-0 z-50 mt-1.5 min-w-full origin-top-right animate-in rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none fade-in-0 zoom-in-95"
        >
          {options.map((option, i) => {
            const selected = option.value === value
            const OptionIcon = option.icon
            return (
              // Keyboard handling lives on the listbox (aria-activedescendant).
              // biome-ignore lint/a11y/useKeyWithClickEvents: see above
              <div
                key={option.value}
                tabIndex={-1}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(option)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-2 pl-2.5 text-sm whitespace-nowrap ${i === active ? 'bg-muted' : ''} ${selected ? 'font-bold' : ''}`}
              >
                {OptionIcon && <OptionIcon className="size-4 text-muted-foreground" />}
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
