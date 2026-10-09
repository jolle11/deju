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

const dateFmt = new Intl.DateTimeFormat('es', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(iso: string) {
  return dateFmt.format(new Date(iso))
}
