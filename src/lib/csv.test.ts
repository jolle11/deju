import { describe, expect, it } from 'vitest'
import { classifyImport, fastsToCsv, parseCsv, parseCsvDate, parseFastsCsv } from './csv'
import type { Fast } from './pb'

describe('parseCsv', () => {
  it('handles quotes, escaped quotes and newlines inside fields', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi""\nthere"\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"\nthere'],
    ])
  })

  it('detects semicolon-separated files and strips the BOM', () => {
    expect(parseCsv('﻿a;b\n1;2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('parseCsvDate', () => {
  it('reads local and ISO dates', () => {
    expect(parseCsvDate('2026-01-05 20:30')).toBe(new Date(2026, 0, 5, 20, 30).toISOString())
    expect(parseCsvDate('2026-01-05T20:30:00Z')).toBe('2026-01-05T20:30:00.000Z')
  })

  it('rejects impossible dates', () => {
    expect(parseCsvDate('2026-02-31 10:00')).toBeNull()
    expect(parseCsvDate('2026-01-05 25:00')).toBeNull()
    expect(parseCsvDate('05/01/2026')).toBeNull()
  })
})

describe('parseFastsCsv', () => {
  const now = new Date('2026-06-01T00:00Z').getTime()

  it('reports every invalid row with its line number', () => {
    const csv = [
      'startedAt,endedAt,targetHours',
      '2026-01-05 20:00,2026-01-06 12:00,16',
      '2026-01-06 20:00,2026-01-06 10:00,16',
      '2026-01-07 20:00,2026-01-08 12:00,200',
    ].join('\n')
    const { rows, errors } = parseFastsCsv(csv, now)
    expect(rows).toHaveLength(1)
    expect(errors).toEqual([
      { code: 'endBeforeStart', line: 3 },
      { code: 'invalidTarget', line: 4, value: '200' },
    ])
  })

  it('requires the mandatory columns', () => {
    expect(parseFastsCsv('startedAt,note\nx,y', now).errors).toEqual([
      { code: 'missingColumn', column: 'endedAt' },
      { code: 'missingColumn', column: 'targetHours' },
    ])
  })

  it('imports legacy exports while ignoring the removed rating column', () => {
    const csv = [
      'startedAt,endedAt,targetHours,rating,note',
      '2026-01-05T20:00:00Z,2026-01-06T12:00:00Z,16,4,Keep this note',
    ].join('\n')
    expect(parseFastsCsv(csv, now)).toEqual({
      rows: [
        {
          startedAt: '2026-01-05T20:00:00.000Z',
          endedAt: '2026-01-06T12:00:00.000Z',
          targetHours: 16,
          note: 'Keep this note',
        },
      ],
      errors: [],
    })
  })

  it('round-trips an export', () => {
    const fast = {
      startedAt: new Date(2026, 0, 5, 20, 30).toISOString(),
      endedAt: new Date(2026, 0, 6, 12, 45).toISOString(),
      targetHours: 16,
      note: 'Hola, "mundo"',
    } as Fast
    expect(parseFastsCsv(fastsToCsv([fast]), now).rows).toEqual([fast])
  })
})

describe('classifyImport', () => {
  const row = (startedAt: string, endedAt: string) => ({
    startedAt,
    endedAt,
    targetHours: 16,
    note: '',
  })

  it('separates duplicates, overlaps and fresh rows', () => {
    const result = classifyImport(
      [
        row('2026-01-01T10:00:00Z', '2026-01-02T02:00:00Z'), // duplicate
        row('2026-01-01T20:00:00Z', '2026-01-02T08:00:00Z'), // overlaps stored
        row('2026-01-03T10:00:00Z', '2026-01-03T20:00:00Z'), // fresh
        row('2026-01-03T15:00:00Z', '2026-01-03T22:00:00Z'), // overlaps previous row
        row('2026-01-05T19:00:00Z', '2026-01-05T20:00:00Z'), // overlaps running fast
      ],
      [
        { startedAt: '2026-01-01 10:00:00.000Z', endedAt: '2026-01-02 02:00:00.000Z' },
        { startedAt: '2026-01-05 18:00:00.000Z', endedAt: '' },
      ],
    )
    expect(result.rows.map((r) => r.startedAt)).toEqual(['2026-01-03T10:00:00Z'])
    expect(result.duplicates).toBe(1)
    expect(result.overlaps).toBe(3)
  })

  it('accepts back-to-back fasts', () => {
    const result = classifyImport(
      [row('2026-01-02T02:00:00Z', '2026-01-02T10:00:00Z')],
      [{ startedAt: '2026-01-01T10:00:00Z', endedAt: '2026-01-02T02:00:00Z' }],
    )
    expect(result.rows).toHaveLength(1)
  })
})
