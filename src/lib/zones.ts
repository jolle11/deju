export type Zone = {
  id: string
  name: string
  fromHours: number
  color: string
  description: string
}

/** Metabolic phases shown on the timer. Keep in sync with worker/src/milestones.ts. */
export const ZONES: Zone[] = [
  {
    id: 'anabolic',
    name: 'Anabólica',
    fromHours: 0,
    color: '#94a3b8',
    description: 'Tu cuerpo digiere y almacena la energía de la última comida.',
  },
  {
    id: 'catabolic',
    name: 'Catabólica',
    fromHours: 4,
    color: '#60d7cf',
    description: 'Bajan la insulina y el glucógeno; empiezas a tirar de reservas.',
  },
  {
    id: 'fat-burning',
    name: 'Quema de grasa',
    fromHours: 16,
    color: '#f5a524',
    description: 'La grasa pasa a ser la principal fuente de energía.',
  },
  {
    id: 'ketosis',
    name: 'Cetosis',
    fromHours: 24,
    color: '#f2555a',
    description: 'El hígado produce cuerpos cetónicos y se activa la autofagia.',
  },
  {
    id: 'deep-ketosis',
    name: 'Cetosis profunda',
    fromHours: 72,
    color: '#b57cf6',
    description: 'Cetosis máxima. Ayuno prolongado: escucha a tu cuerpo.',
  },
]

export function zoneAt(elapsedMs: number) {
  const hours = elapsedMs / 3_600_000
  let index = 0
  ZONES.forEach((z, i) => {
    if (hours >= z.fromHours) index = i
  })
  return { zone: ZONES[index], next: ZONES[index + 1] as Zone | undefined }
}
