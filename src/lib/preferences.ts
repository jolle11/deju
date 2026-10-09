import { useSyncExternalStore } from 'react'
import { LOCALES, type Locale, MESSAGES, type MessageKey } from './messages'
import { currentUser, pb, users } from './pb'

/** '' is the monochrome default; 'system' is the colored theme following the OS. */
export const THEMES = ['', 'system', 'light', 'dark'] as const
export type ThemePref = (typeof THEMES)[number]
export const ACCENTS = ['lagoon', 'sunset', 'violet', 'forest'] as const
export type Accent = (typeof ACCENTS)[number]

export type Prefs = {
  /** "" = follow the device language */
  language: '' | Locale
  /** "" = follow the system theme */
  theme: ThemePref
  accent: Accent
  targetHours: number
  /** 0 = no next-fast reminder */
  eatingWindowHours: number
}

export const DEFAULT_TARGET_HOURS = 16

export const DEFAULT_PREFS: Prefs = {
  language: '',
  theme: '',
  accent: 'lagoon',
  targetHours: DEFAULT_TARGET_HOURS,
  eatingWindowHours: 0,
}

/** Mirrors the prefs locally so the theme applies before React boots (see __root.tsx). */
export const STORAGE_KEY = 'deju-prefs'

function sanitize(raw: Partial<Record<keyof Prefs, unknown>> | null | undefined): Prefs {
  const r = raw ?? {}
  return {
    language: LOCALES.includes(r.language as Locale) ? (r.language as Locale) : '',
    theme: THEMES.includes(r.theme as ThemePref) ? (r.theme as ThemePref) : '',
    accent: ACCENTS.includes(r.accent as Accent) ? (r.accent as Accent) : 'lagoon',
    targetHours: Number(r.targetHours) > 0 ? Number(r.targetHours) : DEFAULT_TARGET_HOURS,
    eatingWindowHours: Number(r.eatingWindowHours) > 0 ? Number(r.eatingWindowHours) : 0,
  }
}

function readLocal(): Partial<Prefs> | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return null
  }
}

// --- store -------------------------------------------------------------------

let prefs: Prefs = DEFAULT_PREFS
const listeners = new Set<() => void>()

function emit(next: Prefs) {
  prefs = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {}
  applyToDocument()
  for (const fn of listeners) fn()
}

/** The logged-in user's record is the source of truth; localStorage is a fast cache. */
function loadFromUser() {
  const user = currentUser()
  emit(sanitize(user ? { ...readLocal(), ...user } : readLocal()))
  syncResolvedLocale()
}

if (typeof window !== 'undefined') {
  prefs = sanitize(readLocal())
  pb.authStore.onChange(() => loadFromUser())
  loadFromUser()
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => applyToDocument())
  window.addEventListener('languagechange', () => {
    for (const fn of listeners) fn()
    syncResolvedLocale()
  })
}

export function usePrefs() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => prefs,
    () => DEFAULT_PREFS,
  )
}

/** Optimistically updates prefs and persists them to the user record. */
export async function updatePrefs(patch: Partial<Prefs>) {
  const previous = prefs
  emit({ ...prefs, ...patch })
  const user = currentUser()
  if (!user) return
  try {
    await users().update(user.id, patch)
    syncResolvedLocale()
  } catch (err) {
    emit(previous)
    throw err
  }
}

// --- theme -------------------------------------------------------------------

export function isMonochromeTheme(theme: ThemePref) {
  return theme === ''
}

export function resolveTheme(theme: ThemePref) {
  if (theme === 'light' || theme === 'dark') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyToDocument() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const dark = resolveTheme(prefs.theme) === 'dark'
  root.classList.toggle('dark', dark)
  root.dataset.theme = prefs.theme || 'default'
  root.dataset.accent = prefs.accent
  root.lang = resolveLocale(prefs.language)
  // Tint the browser/OS chrome to match the background.
  const color = getComputedStyle(root).getPropertyValue('--bg-base').trim()
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = color || (dark ? '#0a1418' : '#e7f3ec')
  }
}

// --- language ----------------------------------------------------------------

export function resolveLocale(language: Prefs['language']): Locale {
  if (language) return language
  if (typeof navigator === 'undefined') return 'es'
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0] as Locale
    if (LOCALES.includes(base)) return base
  }
  return 'en'
}

/** Lets the worker send notifications in the language the user actually sees. */
function syncResolvedLocale() {
  const user = currentUser()
  if (!user) return
  const locale = resolveLocale(prefs.language)
  if (user.locale !== locale)
    users()
      .update(user.id, { locale })
      .catch(() => {})
}

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string

export function useI18n() {
  const { language } = usePrefs()
  // Server render and hydration use the default; the client re-renders right after.
  const locale = useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => resolveLocale(language),
    () => 'es' as Locale,
  )
  const messages = MESSAGES[locale]
  const t: Translate = (key, vars) => {
    let text: string = messages[key] ?? MESSAGES.es[key]
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, String(v))
    return text
  }
  return { t, locale }
}
