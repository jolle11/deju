import { useEffect, useRef, useState } from 'react'
import type { MessageKey } from '#/lib/messages'
import type { Fast } from '#/lib/pb'
import { type Translate, useI18n } from '#/lib/preferences'
import { fromLocalInput, toLocalInput } from '#/lib/time'

export type FastPatch = Partial<Pick<Fast, 'startedAt' | 'endedAt' | 'note' | 'rating'>>

type Mode = 'edit-active' | 'finish' | 'edit-past'

export const RATINGS = ['😫', '😕', '😐', '🙂', '😄']

/**
 * Bottom-sheet style dialog to edit a fast's times, rating and note.
 * The goal comes from settings, so it is not editable here.
 * - edit-active: start time
 * - finish: end time + rating + note
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
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const [startedAt, setStartedAt] = useState(() => toLocalInput(fast.startedAt))
  const [endedAt, setEndedAt] = useState(() => toLocalInput(fast.endedAt || Date.now()))
  const [note, setNote] = useState(fast.note ?? '')
  const [rating, setRating] = useState(fast.rating ?? 0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const showStart = mode !== 'finish'
  const showEnd = mode !== 'edit-active'
  const showNote = mode !== 'edit-active'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const start = new Date(startedAt).getTime()
    const end = new Date(endedAt).getTime()
    const now = Date.now()
    if (showStart && start > now) return setError(t('dialog.startFuture'))
    if (showEnd && end > now + 60_000) return setError(t('dialog.endFuture'))
    if (showEnd && end <= start) return setError(t('dialog.endBeforeStart'))

    const patch: FastPatch = {}
    if (showStart) patch.startedAt = fromLocalInput(startedAt)
    if (showEnd) patch.endedAt = fromLocalInput(endedAt)
    if (showNote) {
      patch.note = note.trim()
      patch.rating = rating
    }

    setBusy(true)
    setError(null)
    try {
      await onSave(patch)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.saveError'))
      setBusy(false)
    }
  }

  async function remove() {
    if (!onDelete || !confirm(t('dialog.confirmDelete'))) return
    setBusy(true)
    try {
      await onDelete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.deleteError'))
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
        <h2 className="font-display text-2xl font-extrabold tracking-tight">
          {mode === 'finish' ? t('dialog.finishTitle') : t('dialog.editTitle')}
        </h2>

        {showStart && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t('dialog.start')}
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
            {t('dialog.end')}
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

        {showNote && <RatingPicker t={t} value={rating} onChange={setRating} />}

        {showNote && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t('dialog.note')}
            <textarea
              rows={3}
              maxLength={500}
              value={note}
              placeholder={t('dialog.notePlaceholder')}
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
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`flex-1 rounded-full px-4 py-3 font-bold disabled:opacity-50 ${
              mode === 'finish' ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground'
            }`}
          >
            {mode === 'finish' ? t('dialog.finish') : t('common.save')}
          </button>
        </div>

        {onDelete && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-sm font-semibold text-destructive"
          >
            {t('dialog.delete')}
          </button>
        )}
      </form>
    </dialog>
  )
}

function RatingPicker({
  t,
  value,
  onChange,
}: {
  t: Translate
  value: number
  onChange: (v: number) => void
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold">{t('dialog.howDidYouFeel')}</legend>
      <div className="flex justify-between gap-2">
        {RATINGS.map((emoji, i) => {
          const v = i + 1
          const selected = v === value
          return (
            <button
              key={emoji}
              type="button"
              aria-pressed={selected}
              aria-label={t(`rating.${v}` as MessageKey)}
              onClick={() => onChange(selected ? 0 : v)}
              className={`grid size-12 place-items-center rounded-full border text-2xl transition-transform ${
                selected
                  ? 'scale-110 border-[var(--lagoon)] bg-[var(--lagoon)]/15'
                  : 'border-input opacity-60'
              }`}
            >
              {emoji}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
