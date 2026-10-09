export type Milestone = { kind: string; hours: number; title: string; body: string }

const INTERMEDIATE_HOURS = [12, 16, 18, 24, 36, 48, 72]

export function milestonesFor(targetHours: number): Milestone[] {
  const list: Milestone[] = INTERMEDIATE_HOURS.filter((h) => h < targetHours).map(
    (h) => ({
      kind: `${h}h`,
      hours: h,
      title: `¡${h} horas de ayuno!`,
      body: `Llevas ${h}h. Te quedan ${targetHours - h}h para tu objetivo.`,
    }),
  )
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
