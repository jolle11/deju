export type Locale = 'es' | 'ca' | 'en'

export function toLocale(value: string | undefined): Locale {
  return value === 'ca' || value === 'en' ? value : 'es'
}

type Zone = 'fat-burning' | 'ketosis' | 'deep-ketosis'

type Texts = {
  hours: (h: number) => string
  elapsed: (h: number) => string
  remaining: (h: number) => string
  zones: Record<Zone, { title: string; body: string }>
  goalTitle: string
  goalBody: (h: number) => string
  nextTitle: string
  nextBody: (h: number) => string
}

/** Keep in sync with the app's src/lib/messages.ts zone wording. */
export const TEXTS: Record<Locale, Texts> = {
  es: {
    hours: (h) => `¡${h} horas de ayuno!`,
    elapsed: (h) => `Llevas ${h}h.`,
    remaining: (h) => `Te quedan ${h}h para tu objetivo.`,
    zones: {
      'fat-burning': {
        title: '🔥 Quema de grasa',
        body: 'La grasa ya es tu principal fuente de energía.',
      },
      ketosis: { title: '⚡ Cetosis', body: 'Tu hígado produce cetonas y se activa la autofagia.' },
      'deep-ketosis': {
        title: '🌌 Cetosis profunda',
        body: 'Ayuno prolongado: escucha a tu cuerpo.',
      },
    },
    goalTitle: '🎉 ¡Objetivo cumplido!',
    goalBody: (h) => `Has completado ${h}h de ayuno.`,
    nextTitle: '⏱️ Hora de ayunar',
    nextBody: (h) => `Tu ventana de comida de ${h}h ha terminado. ¿Empezamos?`,
  },
  ca: {
    hours: (h) => `${h} hores de dejuni!`,
    elapsed: (h) => `Portes ${h}h.`,
    remaining: (h) => `Et queden ${h}h per al teu objectiu.`,
    zones: {
      'fat-burning': {
        title: '🔥 Crema de greix',
        body: 'El greix ja és la teva principal font d’energia.',
      },
      ketosis: { title: '⚡ Cetosi', body: 'El fetge produeix cetones i s’activa l’autofàgia.' },
      'deep-ketosis': {
        title: '🌌 Cetosi profunda',
        body: 'Dejuni prolongat: escolta el teu cos.',
      },
    },
    goalTitle: '🎉 Objectiu assolit!',
    goalBody: (h) => `Has completat ${h}h de dejuni.`,
    nextTitle: '⏱️ Hora de dejunar',
    nextBody: (h) => `La teva finestra de menjar de ${h}h ha acabat. Comencem?`,
  },
  en: {
    hours: (h) => `${h} hours fasted!`,
    elapsed: (h) => `You're at ${h}h.`,
    remaining: (h) => `${h}h to go until your goal.`,
    zones: {
      'fat-burning': { title: '🔥 Fat burning', body: 'Fat is now your main source of energy.' },
      ketosis: {
        title: '⚡ Ketosis',
        body: 'Your liver is making ketones and autophagy kicks in.',
      },
      'deep-ketosis': { title: '🌌 Deep ketosis', body: 'Extended fast: listen to your body.' },
    },
    goalTitle: '🎉 Goal reached!',
    goalBody: (h) => `You completed a ${h}h fast.`,
    nextTitle: '⏱️ Time to fast',
    nextBody: (h) => `Your ${h}h eating window is over. Ready to start?`,
  },
}
