import { useEffect, useRef, useState } from 'react'
import type { Fast } from '#/lib/pb'
import { fromLocalInput, toLocalInput } from '#/lib/time'

export type FastPatch = Partial<Pick<Fast, 'startedAt' | 'endedAt' | 'targetHours' | 'note'>>

type Mode = 'edit-active' | 'finish' | 'edit-past'

const TITLES: Record<Mode, string> = {
  'edit-active': 'Editar ayuno',
  finish: 'Terminar ayuno',
  'edit-past': 'Editar ayuno',
}

/**
 * Bottom-sheet style dialog to edit a fast's times, target and note.
 * - edit-active: start time + target
 * - finish: end time + note
 * - edit-past: everything, plus delete
 */
export function FastDialog({
  fast,
  mode,
  onClose,
  onSave,
  onDelete,
}: {
  fast: Fast
  mode: Mode
  onClose: () => void
  onSave: (patch: FastPatch) => Promise<unknown>
  onDelete?: () => Promise<unknown>
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [startedAt, setStartedAt] = useState(() => toLocalInput(fast.startedAt))
  const [endedAt, setEndedAt] = useState(() => toLocalInput(fast.endedAt || Date.now()))
  const [targetHours, setTargetHours] = useState(fast.targetHours)
  const [note, setNote] = useState(fast.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const showStart = mode !== 'finish'
  const showEnd = mode !== 'edit-active'
  const showTarget = mode !== 'finish'
  const showNote = mode !== 'edit-active'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const start = new Date(startedAt).getTime()
    const end = new Date(endedAt).getTime()
    const now = Date.now()
    if (showStart && start > now) return setError('El inicio no puede estar en el futuro.')
    if (showEnd && end > now + 60_000) return setError('El fin no puede estar en el futuro.')
    if (showEnd && end <= start) return setError('El fin debe ser posterior al inicio.')
    if (showTarget && !(targetHours >= 1 && targetHours <= 168))
      return setError('El objetivo debe estar entre 1 y 168 horas.')

    const patch: FastPatch = {}
    if (showStart) patch.startedAt = fromLocalInput(startedAt)
    if (showEnd) patch.endedAt = fromLocalInput(endedAt)
    if (showTarget) patch.targetHours = targetHours
    if (showNote) patch.note = note.trim()

    setBusy(true)
    setError(null)
    try {
      await onSave(patch)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setBusy(false)
    }
  }

  async function remove() {
    if (!onDelete || !confirm('¿Borrar este ayuno?')) return
    setBusy(true)
    try {
      await onDelete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al borrar')
      setBusy(false)
    }
  }

  const field = 'rounded-xl border border-input bg-transparent px-3 py-2.5 text-base'

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto mb-0 w-full max-w-md rounded-t-3xl bg-card p-0 text-card-foreground backdrop:bg-black/60 sm:mb-auto sm:rounded-3xl"
    >
      <form
        onSubmit={submit}
        className="flex flex-col gap-4 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <h2 className="font-display text-2xl font-extrabold tracking-tight">{TITLES[mode]}</h2>

        {showStart && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Inicio
            <input
              type="datetime-local"
              required
              value={startedAt}
              max={toLocalInput(Date.now())}
              onChange={(e) => setStartedAt(e.target.value)}
              className={field}
            />
          </label>
        )}

        {showEnd && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Fin
            <input
              type="datetime-local"
              required
              value={endedAt}
              max={toLocalInput(Date.now())}
              onChange={(e) => setEndedAt(e.target.value)}
              className={field}
            />
          </label>
        )}

        {showTarget && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Objetivo (horas)
            <input
              type="number"
              required
              min={1}
              max={168}
              value={targetHours}
              onChange={(e) => setTargetHours(Number(e.target.value))}
              className={field}
            />
          </label>
        )}

        {showNote && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Nota
            <textarea
              rows={3}
              maxLength={500}
              value={note}
              placeholder="¿Cómo te has sentido?"
              onChange={(e) => setNote(e.target.value)}
              className={`${field} resize-none font-normal`}
            />
          </label>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="flex-1 rounded-full border border-input px-4 py-3 font-bold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`flex-1 rounded-full px-4 py-3 font-bold disabled:opacity-50 ${
              mode === 'finish' ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground'
            }`}
          >
            {mode === 'finish' ? 'Terminar' : 'Guardar'}
          </button>
        </div>

        {onDelete && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-sm font-semibold text-destructive"
          >
            Borrar ayuno
          </button>
        )}
      </form>
    </dialog>
  )
}
