import { Languages, Monitor, Moon, Sun } from 'lucide-react'
import { LOCALE_NAMES, LOCALES } from '#/lib/messages'
import {
  type Prefs,
  THEMES,
  type ThemePref,
  updatePrefs,
  useI18n,
  usePrefs,
} from '#/lib/preferences'

const THEME_ICON = { '': Monitor, light: Sun, dark: Moon } as const
const THEME_LABEL = { '': 'system', light: 'light', dark: 'dark' } as const

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

  const next: ThemePref = THEMES[(THEMES.indexOf(prefs.theme) + 1) % THEMES.length]
  const ThemeIcon = THEME_ICON[prefs.theme]
  const themeLabel = `${t('settings.theme')}: ${t(`settings.theme.${THEME_LABEL[prefs.theme]}`)}`

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="relative flex items-center rounded-full border border-input text-muted-foreground hover:bg-muted/60">
        <Languages className="pointer-events-none absolute left-2.5 size-4" aria-hidden="true" />
        <select
          aria-label={t('settings.language')}
          value={prefs.language}
          onChange={(e) => save({ language: e.target.value as Prefs['language'] })}
          className="cursor-pointer appearance-none bg-transparent py-1.5 pr-3 pl-8 text-sm font-bold text-foreground outline-none"
        >
          <option value="">{t('settings.language.auto')}</option>
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_NAMES[l]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => save({ theme: next })}
        aria-label={themeLabel}
        title={themeLabel}
        className="flex size-9 items-center justify-center rounded-full border border-input text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      >
        <ThemeIcon className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
