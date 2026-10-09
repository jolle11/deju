import type { Fast } from './pb'

/**
 * CSV import/export for fasts.
 *
 * Columns (header row required, any order, case-insensitive):
 *   startedAt   required  "YYYY-MM-DD HH:MM" local time, or ISO 8601
 *   endedAt     required  same format, after startedAt
 *   targetHours required  whole number 1–168
 *   rating      optional  0–5 (0 or empty = not rated)
 *   note        optional  up to 500 characters
 */
export const CSV_COLUMNS = ['startedAt', 'endedAt', 'targetHours', 'rating', 'note'] as const
type Column = (typeof CSV_COLUMNS)[number]
const REQUIRED: Column[] = ['startedAt', 'endedAt', 'targetHours']

export type FastRow = {
  startedAt: string
  endedAt: string
  targetHours: number
  rating: number
  note: string
}

export type CsvError =
  | { code: 'empty' }
  | { code: 'missingColumn'; column: string }
  | { code: 'invalidDate'; line: number; column: string; value: string }
  | { code: 'endBeforeStart'; line: number }
  | { code: 'inFuture'; line: number }
  | { code: 'invalidTarget'; line: number; value: string }
  | { code: 'invalidRating'; line: number; value: string }
  | { code: 'noteTooLong'; line: number }

// --- generic CSV -------------------------------------------------------------

/** RFC 4180 parser. Detects "," or ";" from the header line (Excel uses ";" in many locales). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '')
  const firstLine = src.slice(0, src.search(/\r?\n|$/))
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        quoted = false
      } else {
        field += c
      }
    } else if (c === '"') {
      quoted = true
    } else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

function escapeField(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Builds a CSV string with a BOM so Excel opens accents correctly. */
export function toCsv(rows: (string | number)[][]) {
  return `﻿${rows.map((r) => r.map((v) => escapeField(String(v))).join(',')).join('\r\n')}\r\n`
}

// --- dates -------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0')

/** Local "YYYY-MM-DD HH:MM", readable and Excel-friendly. */
export function formatCsvDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Accepts "YYYY-MM-DD HH:MM[:SS]" (local time) or full ISO 8601. Returns ISO or null. */
export function parseCsvDate(value: string): string | null {
  const v = value.trim()
  const local = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (local) {
    const [, y, mo, d, h, mi, s] = local.map(Number)
    const date = new Date(y, mo - 1, d, h, mi, s || 0)
    // Reject rollovers like 2026-02-31.
    if (date.getMonth() !== mo - 1 || date.getDate() !== d || h > 23 || mi > 59) return null
    return date.toISOString()
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(v)) {
    const date = new Date(v)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  return null
}

// --- fasts -------------------------------------------------------------------

export function fastsToCsv(items: Fast[]) {
  return toCsv([
    [...CSV_COLUMNS],
    ...items.map((f) => [
      formatCsvDate(f.startedAt),
      f.endedAt ? formatCsvDate(f.endedAt) : '',
      f.targetHours,
      f.rating || '',
      f.note ?? '',
    ]),
  ])
}

export function templateCsv(exampleNote: string) {
  return toCsv([
    [...CSV_COLUMNS],
    ['2026-01-05 20:30', '2026-01-06 12:45', 16, 4, exampleNote],
    ['2026-01-06 21:00', '2026-01-07 11:00', 13, '', ''],
  ])
}

/** Validates every row; returns the good rows and all errors (1-based file line numbers). */
export function parseFastsCsv(text: string, now = Date.now()) {
  const rows = parseCsv(text)
  const errors: CsvError[] = []
  if (rows.length < 2) return { rows: [] as FastRow[], errors: [{ code: 'empty' } as CsvError] }

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const index = Object.fromEntries(
    CSV_COLUMNS.map((c) => [c, header.indexOf(c.toLowerCase())]),
  ) as Record<Column, number>
  for (const column of REQUIRED) {
    if (index[column] === -1) errors.push({ code: 'missingColumn', column })
  }
  if (errors.length) return { rows: [] as FastRow[], errors }

  const result: FastRow[] = []
  rows.slice(1).forEach((r, i) => {
    const line = i + 2
    const get = (c: Column) => (index[c] === -1 ? '' : (r[index[c]] ?? '').trim())
    const rowErrors: CsvError[] = []

    const startedAt = parseCsvDate(get('startedAt'))
    if (!startedAt)
      rowErrors.push({ code: 'invalidDate', line, column: 'startedAt', value: get('startedAt') })
    const endedAt = parseCsvDate(get('endedAt'))
    if (!endedAt)
      rowErrors.push({ code: 'invalidDate', line, column: 'endedAt', value: get('endedAt') })
    if (startedAt && endedAt) {
      if (new Date(endedAt) <= new Date(startedAt)) rowErrors.push({ code: 'endBeforeStart', line })
      else if (new Date(endedAt).getTime() > now + 60_000)
        rowErrors.push({ code: 'inFuture', line })
    }

    const targetRaw = get('targetHours')
    const targetHours = Number(targetRaw)
    if (!Number.isInteger(targetHours) || targetHours < 1 || targetHours > 168)
      rowErrors.push({ code: 'invalidTarget', line, value: targetRaw })

    const ratingRaw = get('rating')
    const rating = ratingRaw === '' ? 0 : Number(ratingRaw)
    if (!Number.isInteger(rating) || rating < 0 || rating > 5)
      rowErrors.push({ code: 'invalidRating', line, value: ratingRaw })

    const note = get('note')
    if (note.length > 500) rowErrors.push({ code: 'noteTooLong', line })

    if (rowErrors.length) errors.push(...rowErrors)
    else if (startedAt && endedAt) result.push({ startedAt, endedAt, targetHours, rating, note })
  })

  return { rows: result, errors }
}

export function downloadFile(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
