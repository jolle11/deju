import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Contrast, Monitor, Moon, Sun } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { AppShell } from '#/components/app-shell'
import { DataSection } from '#/components/data-section'
import { GoalPicker } from '#/components/goal-picker'
import { PushToggle } from '#/components/push-toggle'
import { Select } from '#/components/select'
import { logout } from '#/lib/auth'
import { LOCALE_NAMES, LOCALES } from '#/lib/messages'
import { currentUser, fasts, isLoggedIn } from '#/lib/pb'
import {
  ACCENTS,
  type Accent,
  type Prefs,
  type ThemePref,
  updatePrefs,
  useI18n,
  usePrefs,
} from '#/lib/preferences'
import { pushRelevant } from '#/lib/push'

const WINDOW_OPTIONS = [0, 4, 6, 8, 10, 12]

/** Swatch shown in the picker; matches the light-theme accent in styles.css. */
const ACCENT_SWATCH: Record<Accent, string> = {
  default: '#737373',
  lagoon: '#4fb8b2',
  sunset: '#e0662f',
  violet: '#7c5cff',
  forest: '#2f8a4f',
  custom: '',
}

const THEME_OPTIONS: {
  value: ThemePref
  label: ThemePref
  Icon: typeof Sun
}[] = [
  { value: 'system', label: 'system', Icon: Monitor },
  { value: 'light', label: 'light', Icon: Sun },
  { value: 'dark', label: 'dark', Icon: Moon },
]

export const Route = createFileRoute('/settings')({
  beforeLoad: () => {
    if (!isLoggedIn()) throw redirect({ to: '/welcome' })
  },
  component: Settings,
})

function Settings() {
  const { t } = useI18n()
  const prefs = usePrefs()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  /** Runs a save and shows its error; returns false if it failed. */
  async function attempt(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.saveError'))
      return false
    }
  }

  function save(patch: Partial<Prefs>) {
    return attempt(() => updatePrefs(patch))
  }

  async function saveGoal(hours: number) {
    if (!(await save({ targetHours: hours }))) return
    // The goal also applies to the fast in progress.
    await attempt(async () => {
      const active = await fasts()
        .getFirstListItem('endedAt = ""', { requestKey: null })
        .catch(() => null)
      if (active && active.targetHours !== hours)
        await fasts().update(active.id, { targetHours: hours })
    })
  }

  async function signOut() {
    await logout()
    navigate({ to: '/welcome' })
  }

  return (
    <AppShell title={t('settings.title')}>
      {error && (
        <p role="alert" className="rounded-xl border border-destructive px-4 py-2 text-sm">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
          <Card title={t('settings.goal')} description={t('settings.goal.desc')}>
            <GoalPicker value={prefs.targetHours} onChange={saveGoal} />
          </Card>

          <Card title={t('settings.eatingWindow')} description={t('settings.eatingWindow.desc')}>
            <Select
              label={t('settings.eatingWindow')}
              options={WINDOW_OPTIONS.map((h) => ({
                value: h,
                label: h === 0 ? t('settings.eatingWindow.off') : `${h}h`,
              }))}
              value={prefs.eatingWindowHours}
              onChange={(h) => save({ eatingWindowHours: h })}
            />
          </Card>

          {pushRelevant() && (
            <Card>
              <PushToggle />
            </Card>
          )}

          <DataSection />
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
          <Card title={t('settings.appearance')}>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">{t('settings.theme')}</span>
              <div
                className="grid grid-cols-3 gap-2"
                role="radiogroup"
                aria-label={t('settings.theme')}
              >
                {THEME_OPTIONS.map(({ value, label, Icon }) => {
                  const selected = prefs.theme === value
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: styled segmented control
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => save({ theme: value })}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-sm font-bold ${
                        selected
                          ? 'border-[var(--lagoon)] bg-[var(--lagoon)]/10'
                          : 'border-input text-muted-foreground'
                      }`}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                      {t(`settings.theme.${label}`)}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">{t('settings.accent')}</span>
              <Select
                label={t('settings.accent')}
                options={ACCENTS.map((accent) => ({
                  value: accent,
                  label: t(`settings.accent.${accent}`),
                  leading: <AccentSwatch accent={accent} customColor={prefs.customColor} />,
                }))}
                value={prefs.accent}
                onChange={(accent) => save({ accent })}
              />
              {prefs.accent === 'custom' && (
                <CustomColorPicker
                  value={prefs.customColor}
                  label={t('settings.accent.customColor')}
                  onChange={(customColor) => save({ customColor })}
                />
              )}
            </div>
          </Card>

          <Card title={t('settings.language')}>
            <Select
              label={t('settings.language')}
              options={[
                { value: '' as const, label: t('settings.language.auto') },
                ...LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] })),
              ]}
              value={prefs.language}
              onChange={(language) => save({ language })}
            />
          </Card>

          <Card title={t('settings.account')}>
            <p className="text-sm text-muted-foreground">{currentUser()?.email}</p>
            <button
              type="button"
              onClick={signOut}
              className="self-start rounded-full border border-input px-5 py-2.5 font-bold text-red-500 dark:text-red-400"
            >
              {t('settings.logout')}
            </button>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

function Card({
  title,
  description,
  children,
}: {
  title?: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-input p-4 lg:p-6">
      {title && (
        <div>
          <h2 className="font-display text-lg font-extrabold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

/** Previews while dragging and only persists once the color settles. */
function CustomColorPicker({
  value,
  label,
  onChange,
}: {
  value: string
  label: string
  onChange: (color: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => setDraft(value), [value])
  useEffect(() => () => clearTimeout(timer.current), [])

  function pick(color: string) {
    setDraft(color)
    document.documentElement.style.setProperty('--custom-accent', color)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(color), 400)
  }

  return (
    <label className="flex items-center gap-3 rounded-xl border border-input px-3 py-2 text-sm font-semibold">
      <input
        type="color"
        value={draft}
        onChange={(e) => pick(e.target.value)}
        className="size-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
      />
      <span className="flex-1">{label}</span>
      <span className="font-mono text-muted-foreground uppercase">{draft}</span>
    </label>
  )
}

function AccentSwatch({ accent, customColor }: { accent: Accent; customColor: string }) {
  return accent === 'default' ? (
    <Contrast className="size-6 text-muted-foreground" aria-hidden="true" />
  ) : (
    <span
      className="size-6 rounded-full"
      style={{ backgroundColor: accent === 'custom' ? customColor : ACCENT_SWATCH[accent] }}
      aria-hidden="true"
    />
  )
}
