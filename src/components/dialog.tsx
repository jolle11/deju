import { type ReactNode, useEffect, useId, useRef } from 'react'

/** Shared modal surface. Mount to open; unmount to close. */
export function Dialog({
  title,
  description,
  children,
  onClose,
  busy = false,
  role = 'dialog',
}: {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
  role?: 'dialog' | 'alertdialog'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const previousFocus = document.activeElement
    if (!dialog.open) dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus()
    return () => {
      dialog.close()
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (!busy) onClose()
      }}
      className="m-auto mb-0 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-t-3xl border border-input bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm sm:mb-auto sm:rounded-3xl"
    >
      <div className="flex flex-col gap-4 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <h2 id={titleId} className="font-display text-2xl font-extrabold tracking-tight">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {children}
      </div>
    </dialog>
  )
}
