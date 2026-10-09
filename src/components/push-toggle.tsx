import { useEffect, useState } from 'react'
import { disablePush, enablePush, getPushSubscription, pushSupported } from '#/lib/push'

export function PushToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pushSupported()) return
    getPushSubscription().then((s) => setEnabled(Boolean(s)))
  }, [])

  if (!pushSupported()) {
    return (
      <p className="text-sm text-muted-foreground">
        Para recibir avisos, instala la app en tu pantalla de inicio.
      </p>
    )
  }
  if (enabled === null) return null

  async function toggle() {
    setError(null)
    try {
      if (enabled) await disablePush()
      else await enablePush()
      setEnabled(!enabled)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center justify-between gap-4 font-semibold">
        Notificaciones
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
