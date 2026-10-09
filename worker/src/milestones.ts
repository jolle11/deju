export type Milestone = { kind: string; hours: number; title: string; body: string }

const INTERMEDIATE_HOURS = [12, 16, 18, 24, 36, 48, 72]

/** Hours where a new fasting zone starts. Keep in sync with src/lib/zones.ts. */
const ZONE_STARTS: Record<number, { title: string; body: string }> = {
  16: { title: '🔥 Quema de grasa', body: 'La grasa ya es tu principal fuente de energía.' },
  24: { title: '⚡ Cetosis', body: 'Tu hígado produce cetonas y se activa la autofagia.' },
  72: { title: '🌌 Cetosis profunda', body: 'Ayuno prolongado: escucha a tu cuerpo.' },
}

export function milestonesFor(targetHours: number): Milestone[] {
  const list: Milestone[] = INTERMEDIATE_HOURS.filter((h) => h < targetHours).map((h) => {
    const zone = ZONE_STARTS[h]
    const remaining = `Te quedan ${targetHours - h}h para tu objetivo.`
    return {
      kind: `${h}h`,
      hours: h,
      title: zone ? `${zone.title} · ${h}h` : `¡${h} horas de ayuno!`,
      body: zone ? `${zone.body} ${remaining}` : `Llevas ${h}h. ${remaining}`,
    }
  })
  list.push({
    kind: 'goal',
    hours: targetHours,
    title: '🎉 ¡Objetivo cumplido!',
    body: `Has completado ${targetHours}h de ayuno.`,
  })
  return list
}

/** Milestones already reached, ordered from oldest to newest. */
export function reachedMilestones(startedAt: Date, targetHours: number, now: Date) {
  const elapsedHours = (now.getTime() - startedAt.getTime()) / 3_600_000
  return milestonesFor(targetHours).filter((m) => elapsedHours >= m.hours)
}
