import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { GoalPicker } from '#/components/goal-picker'
import { PlanPicker } from '#/components/plan-picker'
import { currentUser, isLoggedIn } from '#/lib/pb'
import { DEFAULT_TARGET_HOURS, type Prefs, updatePrefs, useI18n } from '#/lib/preferences'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: () => {
    if (!isLoggedIn()) throw redirect({ to: '/welcome' })
  },
  component: Onboarding,
})

/**
 * First visit: pick the fasting goal, then choose whether to log body
 * measurements. Users who already chose a goal only see the second step.
 */
function Onboarding() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [step, setStep] = useState<'goal' | 'body'>(currentUser()?.targetHours ? 'body' : 'goal')
  const [hours, setHours] = useState(currentUser()?.targetHours || DEFAULT_TARGET_HOURS)
  // Eating window from the chosen plan; a custom goal keeps the current one.
  const [windowHours, setWindowHours] = useState(currentUser()?.eatingWindowHours ?? 0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(patch: Partial<Prefs>, then: () => void) {
    setBusy(true)
    setError(null)
    try {
      await updatePrefs(patch)
      then()
    } catch {
      setError(t('common.saveError'))
    } finally {
      setBusy(false)
    }
  }

  const primary =
    'w-full rounded-full bg-primary px-6 py-4 text-lg font-extrabold text-primary-foreground disabled:opacity-50'

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-8 px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <span className="font-display text-3xl font-extrabold tracking-tight">{t('app.name')}</span>
      <div className="flex flex-1 flex-col justify-center gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            {step === 'goal' ? t('onboarding.title') : t('onboarding.body.title')}
          </h1>
          <p className="text-muted-foreground">
            {step === 'goal' ? t('onboarding.desc') : t('onboarding.body.desc')}
          </p>
        </div>
        {step === 'goal' && (
          <>
            <PlanPicker
              fastHours={hours}
              windowHours={windowHours}
              onPick={(p) => {
                setHours(p.fastHours)
                setWindowHours(p.windowHours)
              }}
            />
            <GoalPicker key={hours} value={hours} onChange={setHours} />
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      {step === 'goal' ? (
        <button
          type="button"
          onClick={() =>
            save({ targetHours: hours, eatingWindowHours: windowHours }, () =>
              currentUser()?.bodyTracking ? navigate({ to: '/' }) : setStep('body'),
            )
          }
          disabled={busy}
          className={primary}
        >
          {t('onboarding.continue')}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => save({ bodyTracking: 'on' }, () => navigate({ to: '/' }))}
            disabled={busy}
            className={primary}
          >
            {t('onboarding.body.yes')}
          </button>
          <button
            type="button"
            onClick={() => save({ bodyTracking: 'off' }, () => navigate({ to: '/' }))}
            disabled={busy}
            className="w-full rounded-full border border-input px-6 py-4 text-lg font-extrabold disabled:opacity-50"
          >
            {t('onboarding.body.no')}
          </button>
        </div>
      )}
    </main>
  )
}
