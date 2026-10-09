import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Contrast, Monitor, Moon, Sun } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { AppShell } from '#/components/app-shell'
import { DataSection } from '#/components/data-section'
import { GoalPicker } from '#/components/goal-picker'
import { PushToggle } from '#/components/push-toggle'
import { LOCALE_NAMES, LOCALES } from '#/lib/messages'
import { currentUser, fasts, isLoggedIn, pb } from '#/lib/pb'
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

  async function save(patch: Partial<Prefs>) {
    setError(null)
    try {
      await updatePrefs(patch)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.saveError'))
    }
  }

  async function saveGoal(hours: number) {
    await save({ targetHours: hours })
    // The goal also applies to the fast in progress.
    const active = await fasts()
      .getFirstListItem('endedAt = ""', { requestKey: null })
      .catch(() => null)
    if (active && active.targetHours !== hours)
      await fasts().update(active.id, { targetHours: hours })
  }

  function logout() {
    pb.authStore.clear()
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
        <div className="flex flex-col gap-4 lg:gap-6">
          <Card title={t('settings.goal')} description={t('settings.goal.desc')}>
            <GoalPicker value={prefs.targetHours} onChange={saveGoal} />
          </Card>

          <Card title={t('settings.eatingWindow')} description={t('settings.eatingWindow.desc')}>
            <Chips
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

        <div className="flex flex-col gap-4 lg:gap-6">
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
              <div
                className="flex flex-wrap gap-3"
                role="radiogroup"
                aria-label={t('settings.accent')}
              >
                {ACCENTS.map((accent) => {
                  const selected = prefs.accent === accent
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: styled swatch picker
                    <button
                      key={accent}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => save({ accent })}
                      className="flex items-center gap-2 rounded-full border border-input py-1.5 pr-4 pl-1.5 text-sm font-bold aria-checked:border-foreground"
                    >
                      {accent === 'default' ? (
                        <Contrast className="size-6 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <span
                          className="size-6 rounded-full"
                          style={{ backgroundColor: ACCENT_SWATCH[accent] }}
                          aria-hidden="true"
                        />
                      )}
                      {t(`settings.accent.${accent}`)}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>

          <Card title={t('settings.language')}>
            <Chips
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
              onClick={logout}
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

function Chips<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => (
        // biome-ignore lint/a11y/useSemanticElements: styled chip group
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-4 py-1.5 text-sm font-bold ${
            o.value === value ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
