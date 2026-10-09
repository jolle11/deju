import { Dialog } from '#/components/dialog'
import { useI18n } from '#/lib/preferences'

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  busy = false,
  error,
  destructive = false,
}: {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  busy?: boolean
  error?: string | null
  destructive?: boolean
}) {
  const { t } = useI18n()

  return (
    <Dialog
      role="alertdialog"
      title={title}
      description={description}
      onClose={onClose}
      busy={busy}
    >
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          data-dialog-initial-focus
          onClick={onClose}
          disabled={busy}
          className="flex-1 rounded-full border border-input px-4 py-3 font-bold disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`flex-1 rounded-full px-4 py-3 font-bold disabled:opacity-50 ${
            destructive ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
