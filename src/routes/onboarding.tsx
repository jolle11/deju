import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { GoalPicker } from '#/components/goal-picker'
import { currentUser, isLoggedIn } from '#/lib/pb'
import { DEFAULT_TARGET_HOURS, updatePrefs, useI18n } from '#/lib/preferences'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: () => {
    if (!isLoggedIn()) throw redirect({ to: '/welcome' })
  },
  component: Onboarding,
})

/** First visit: pick the fasting goal before reaching the timer. */
function Onboarding() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [hours, setHours] = useState(currentUser()?.targetHours || DEFAULT_TARGET_HOURS)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onContinue() {
    setBusy(true)
    setError(null)
    try {
      await updatePrefs({ targetHours: hours })
      navigate({ to: '/' })
    } catch {
      setError(t('common.saveError'))
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-8 px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <span className="font-display text-3xl font-extrabold tracking-tight">{t('app.name')}</span>
      <div className="flex flex-1 flex-col justify-center gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            {t('onboarding.title')}
          </h1>
          <p className="text-muted-foreground">{t('onboarding.desc')}</p>
        </div>
        <GoalPicker value={hours} onChange={setHours} />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <button
        type="button"
        onClick={onContinue}
        disabled={busy}
        className="w-full rounded-full bg-primary px-6 py-4 text-lg font-extrabold text-primary-foreground disabled:opacity-50"
      >
        {t('onboarding.continue')}
      </button>
    </main>
  )
}
