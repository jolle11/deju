import { downloadFile } from './csv'
import { type DayLevel, dayKey } from './stats'

export type MonthCard = {
  title: string
  /** Four headline figures: [label, value] */
  figures: [string, string][]
  /** Footer line, e.g. the best streak */
  footer: string
  month: Date
  dayLevels: Map<string, DayLevel>
  weekdayLabels: string[]
}

const W = 1080
const H = 1350
const PAD = 90

/** Resolves a CSS expression (vars, color-mix…) to a value the canvas understands. */
function resolve(property: 'color' | 'fontFamily', className: string, value?: string) {
  const el = document.createElement('span')
  el.className = className
  if (value) el.style.color = value
  document.body.append(el)
  const out = getComputedStyle(el)[property]
  el.remove()
  return out
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 36)
  ctx.fill()
}

/** Draws the month summary in the current theme and accent. */
export async function renderMonthCard(card: MonthCard): Promise<Blob> {
  await document.fonts.ready
  const background = getComputedStyle(document.body).backgroundColor
  const foreground = getComputedStyle(document.body).color
  const muted = resolve('color', 'text-muted-foreground')
  const accent = resolve('color', '', 'var(--lagoon)')
  const accentInk = resolve('color', '', 'var(--lagoon-foreground)')
  const tile = resolve('color', '', 'color-mix(in oklab, currentColor 6%, transparent)')
  const display = resolve('fontFamily', 'font-display')
  const body = getComputedStyle(document.body).fontFamily

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  ctx.fillStyle = background
  ctx.fillRect(0, 0, W, H)

  // Header
  ctx.fillStyle = accent
  ctx.font = `800 40px ${display}`
  ctx.fillText('Deju', PAD, PAD + 30)
  ctx.fillStyle = foreground
  ctx.font = `800 76px ${display}`
  ctx.fillText(card.title, PAD, PAD + 130)

  // Figures: 2 × 2 tiles
  const gap = 20
  const tileW = (W - PAD * 2 - gap) / 2
  const tileH = 150
  card.figures.forEach(([label, value], i) => {
    const x = PAD + (i % 2) * (tileW + gap)
    const y = PAD + 190 + Math.floor(i / 2) * (tileH + gap)
    ctx.fillStyle = tile
    roundRect(ctx, x, y, tileW, tileH)
    ctx.fillStyle = foreground
    ctx.font = `800 72px ${display}`
    ctx.fillText(value, x + 36, y + 85)
    ctx.fillStyle = muted
    ctx.font = `700 26px ${body}`
    ctx.fillText(label.toUpperCase(), x + 36, y + 125)
  })

  // Month calendar, Monday first
  const top = PAD + 190 + 2 * (tileH + gap) + 30
  const cell = (W - PAD * 2) / 7
  const radius = cell * 0.3
  ctx.textAlign = 'center'
  ctx.fillStyle = muted
  ctx.font = `700 26px ${body}`
  card.weekdayLabels.forEach((label, i) => {
    ctx.fillText(label.toUpperCase(), PAD + cell * i + cell / 2, top + 20)
  })
  const first = new Date(card.month.getFullYear(), card.month.getMonth(), 1)
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const leading = (first.getDay() + 6) % 7
  ctx.font = `700 30px ${body}`
  ctx.textBaseline = 'middle'
  for (let d = 1; d <= days; d++) {
    const slot = leading + d - 1
    const cx = PAD + cell * (slot % 7) + cell / 2
    const cy = top + 70 + Math.floor(slot / 7) * (radius * 2 + 14)
    const level = card.dayLevels.get(dayKey(new Date(first.getFullYear(), first.getMonth(), d)))
    if (level) {
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      if (level === 'goal') {
        ctx.fillStyle = accent
        ctx.fill()
      } else {
        ctx.lineWidth = 4
        ctx.strokeStyle = accent
        ctx.stroke()
      }
    }
    ctx.fillStyle = level === 'goal' ? accentInk : level ? foreground : muted
    ctx.fillText(String(d), cx, cy + 2)
  }

  // Footer
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = muted
  ctx.font = `700 32px ${body}`
  ctx.fillText(card.footer, PAD, H - PAD + 10)

  return new Promise((resolveBlob, reject) =>
    canvas.toBlob((b) => (b ? resolveBlob(b) : reject(new Error('Export failed'))), 'image/png'),
  )
}

/** Opens the system share sheet when files can be shared, otherwise downloads. */
export async function shareImage(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return
    } catch (err) {
      // The user closed the share sheet: nothing else to do.
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }
  downloadFile(filename, blob)
}
