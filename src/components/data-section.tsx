import { Download, FileUp, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  CSV_COLUMNS,
  type CsvError,
  downloadFile,
  type FastRow,
  fastsToCsv,
  parseFastsCsv,
  templateCsv,
} from '#/lib/csv'
import type { MessageKey } from '#/lib/messages'
import { currentUserId, fasts } from '#/lib/pb'
import { type Translate, useI18n } from '#/lib/preferences'

const REQUIRED = new Set(['startedAt', 'endedAt', 'targetHours'])
const MAX_ERRORS_SHOWN = 8

type Preview = { rows: FastRow[]; duplicates: number; errors: CsvError[] }

function errorText(t: Translate, e: CsvError) {
  const { code, ...vars } = e
  return t(`data.err.${code}` as MessageKey, vars as Record<string, string | number>)
}

/** Same start minute = same fast. Used to skip rows that were already imported. */
const minuteKey = (iso: string) => Math.floor(new Date(iso).getTime() / 60_000)

export function DataSection() {
  const { t } = useI18n()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  async function exportCsv() {
    setMessage(null)
    // Only finished fasts, so an export can always be re-imported as-is.
    const items = await fasts().getFullList({
      filter: 'endedAt != ""',
      sort: 'startedAt',
      requestKey: null,
    })
    if (items.length === 0) return setMessage(t('data.exportEmpty'))
    downloadFile(`deju-${today}.csv`, fastsToCsv(items))
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    setMessage(null)
    try {
      const { rows, errors } = parseFastsCsv(await file.text())
      const existing = await fasts().getFullList({ fields: 'startedAt', requestKey: null })
      const taken = new Set(existing.map((f) => minuteKey(f.startedAt)))
      const fresh = rows.filter((r) => {
        const key = minuteKey(r.startedAt)
        if (taken.has(key)) return false
        taken.add(key) // also dedupe within the file
        return true
      })
      setPreview({ rows: fresh, duplicates: rows.length - fresh.length, errors })
    } catch {
      setMessage(t('data.err.read'))
    }
  }

  async function runImport() {
    if (!preview) return
    const user = currentUserId()
    const total = preview.rows.length
    setProgress({ done: 0, total })
    let done = 0
    try {
      for (const row of preview.rows) {
        await fasts().create({ user, ...row }, { requestKey: null })
        done++
        setProgress({ done, total })
      }
      setMessage(t('data.imported', { n: done }))
    } catch (err) {
      setMessage(
        `${t('data.imported', { n: done })} ${err instanceof Error ? err.message : t('common.error')}`,
      )
    } finally {
      setProgress(null)
      setPreview(null)
    }
  }

  const button =
    'inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-bold disabled:opacity-50'

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-input p-4 lg:p-6">
      <div>
        <h2 className="font-display text-lg font-extrabold">{t('data.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('data.desc')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={exportCsv} className={button}>
          <Download className="size-4" aria-hidden="true" />
          {t('data.export')}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={Boolean(progress)}
          className={button}
        >
          <Upload className="size-4" aria-hidden="true" />
          {t('data.import')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="hidden"
        />
      </div>

      {preview && (
        <ImportPreview
          t={t}
          preview={preview}
          progress={progress}
          onConfirm={runImport}
          onCancel={() => setPreview(null)}
        />
      )}

      {message && <output className="text-sm font-semibold">{message}</output>}

      <details className="group rounded-xl border border-input px-4 py-3 text-sm">
        <summary className="cursor-pointer font-bold">{t('data.format')}</summary>
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-muted-foreground">{t('data.formatIntro')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3">{t('data.col.name')}</th>
                  <th className="py-1 pr-3">{t('data.col.required')}</th>
                  <th className="py-1">{t('data.col.desc')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-input">
                {CSV_COLUMNS.map((c) => (
                  <tr key={c}>
                    <td className="py-2 pr-3 align-top">
                      <code>{c}</code>
                    </td>
                    <td className="py-2 pr-3 align-top">
                      {REQUIRED.has(c) ? t('data.yes') : t('data.no')}
                    </td>
                    <td className="py-2 align-top text-muted-foreground">
                      {t(`data.col.${c}` as MessageKey)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-muted/60 p-3 text-xs">
            {templateCsv(t('data.templateNote')).replace(/^﻿/, '').trim()}
          </pre>
          <button
            type="button"
            onClick={() => downloadFile('deju-plantilla.csv', templateCsv(t('data.templateNote')))}
            className={`${button} self-start`}
          >
            <FileUp className="size-4" aria-hidden="true" />
            {t('data.template')}
          </button>
        </div>
      </details>
    </section>
  )
}

function ImportPreview({
  t,
  preview,
  progress,
  onConfirm,
  onCancel,
}: {
  t: Translate
  preview: Preview
  progress: { done: number; total: number } | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const { rows, duplicates, errors } = preview
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4 text-sm">
      <p className="font-bold">
        {rows.length > 0 ? t('data.preview', { n: rows.length }) : t('data.nothing')}
      </p>
      {duplicates > 0 && (
        <p className="text-muted-foreground">{t('data.duplicates', { n: duplicates })}</p>
      )}
      {errors.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-red-600 dark:text-red-400">
            {t('data.errorsTitle', { n: errors.length })}
          </p>
          <ul className="list-disc pl-5 text-muted-foreground">
            {errors.slice(0, MAX_ERRORS_SHOWN).map((e) => (
              <li key={JSON.stringify(e)}>{errorText(t, e)}</li>
            ))}
          </ul>
          {errors.length > MAX_ERRORS_SHOWN && (
            <p className="text-muted-foreground">
              {t('data.moreErrors', { n: errors.length - MAX_ERRORS_SHOWN })}
            </p>
          )}
        </div>
      )}
      <div className="flex gap-2">
        {rows.length > 0 && (
          <button
            type="button"
            onClick={onConfirm}
            disabled={Boolean(progress)}
            className="rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-60"
          >
            {progress
              ? t('data.importing', { done: progress.done, total: progress.total })
              : t('data.confirm', { n: rows.length })}
          </button>
        )}
        {!progress && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-input px-4 py-2 font-bold"
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    </div>
  )
}
