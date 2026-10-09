import { useState } from 'react'
import type { Weight } from '#/lib/pb'

const dateFmt = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })

const W = 320
const H = 140
const PAD = { top: 16, right: 12, bottom: 20, left: 12 }

/** Single-series weight trend. Expects entries sorted by date ascending. */
export function WeightChart({ entries }: { entries: Weight[] }) {
  const [hover, setHover] = useState<number | null>(null)
  if (entries.length < 2) return null

  const times = entries.map((e) => new Date(e.measuredAt).getTime())
  const kgs = entries.map((e) => e.kg)
  const minT = times[0]
  const maxT = times[times.length - 1]
  const minK = Math.min(...kgs) - 0.5
  const maxK = Math.max(...kgs) + 0.5
  const x = (t: number) => PAD.left + ((t - minT) / (maxT - minT || 1)) * (W - PAD.left - PAD.right)
  const y = (k: number) => PAD.top + (1 - (k - minK) / (maxK - minK)) * (H - PAD.top - PAD.bottom)
  const points = entries.map((e, i) => [x(times[i]), y(e.kg)] as const)
  const path = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join(' ')
  const active = hover ?? entries.length - 1
  const [ax, ay] = points[active]

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    points.forEach(([qx], i) => {
      if (Math.abs(qx - px) < Math.abs(points[best][0] - px)) best = i
    })
    setHover(best)
  }

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between text-sm font-semibold text-muted-foreground">
        <span>Evolución</span>
        <span className="tabular-nums">
          {dateFmt.format(times[active])} ·{' '}
          <span className="font-display text-base font-extrabold text-foreground">
            {entries[active].kg} kg
          </span>
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label={`Peso de ${kgs[0]} a ${kgs[kgs.length - 1]} kg`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={H - PAD.bottom}
          y2={H - PAD.bottom}
          className="stroke-input"
        />
        <path d={path} fill="none" stroke="var(--lagoon)" strokeWidth="2" strokeLinejoin="round" />
        <line x1={ax} x2={ax} y1={PAD.top} y2={H - PAD.bottom} className="stroke-input" />
        <circle
          cx={ax}
          cy={ay}
          r="5"
          fill="var(--lagoon)"
          className="stroke-background"
          strokeWidth="2"
        />
        <text x={PAD.left} y={H - 4} className="fill-muted-foreground text-[10px] font-bold">
          {dateFmt.format(minT)}
        </text>
        <text
          x={W - PAD.right}
          y={H - 4}
          textAnchor="end"
          className="fill-muted-foreground text-[10px] font-bold"
        >
          {dateFmt.format(maxT)}
        </text>
      </svg>
    </figure>
  )
}
