import { useEffect, useState } from 'react'
import { useI18n } from '#/lib/preferences'
import {
  disablePush,
  enablePush,
  getPushSubscription,
  PushPermissionError,
  pushSupported,
} from '#/lib/push'

export function PushToggle() {
  const { t } = useI18n()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pushSupported()) return
    getPushSubscription().then((s) => setEnabled(Boolean(s)))
  }, [])

  if (!pushSupported()) {
    return <p className="text-sm text-muted-foreground">{t('settings.notifications.install')}</p>
  }
  if (enabled === null) return null

  async function toggle() {
    setError(null)
    try {
      if (enabled) await disablePush()
      else await enablePush()
      setEnabled(!enabled)
    } catch (err) {
      setError(
        err instanceof PushPermissionError
          ? t('settings.notifications.denied')
          : err instanceof Error
            ? err.message
            : t('common.error'),
      )
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center justify-between gap-4 font-semibold">
        {t('settings.notifications')}
        <input
          type="checkbox"
          role="switch"
          aria-checked={enabled}
          checked={enabled}
          onChange={toggle}
          className="size-6 accent-[var(--lagoon)]"
        />
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
