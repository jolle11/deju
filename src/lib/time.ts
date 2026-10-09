export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

/** "16h 05m" — compact form for lists. */
export function formatHours(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

/** ISO string → value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string | number) {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

/** <input type="datetime-local"> value → ISO string. */
export function fromLocalInput(value: string) {
  return new Date(value).toISOString()
}

const dateFormats = new Map<string, Intl.DateTimeFormat>()

/** Cached Intl formatter per locale + options (formatters are costly to build). */
export function dateFormat(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`
  let fmt = dateFormats.get(key)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, options)
    dateFormats.set(key, fmt)
  }
  return fmt
}

export function formatDate(iso: string, locale: string) {
  return dateFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
