import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { BellRing, ChartNoAxesColumn, Flame, Timer } from 'lucide-react'
import { QuickPrefs } from '#/components/quick-prefs'
import { isLoggedIn } from '#/lib/pb'
import { useI18n } from '#/lib/preferences'

export const Route = createFileRoute('/welcome')({
  beforeLoad: () => {
    if (isLoggedIn()) throw redirect({ to: '/' })
  },
  component: Welcome,
})

const FEATURES = [
  { Icon: Timer, title: 'welcome.f1.title', desc: 'welcome.f1.desc' },
  { Icon: Flame, title: 'welcome.f2.title', desc: 'welcome.f2.desc' },
  { Icon: ChartNoAxesColumn, title: 'welcome.f3.title', desc: 'welcome.f3.desc' },
  { Icon: BellRing, title: 'welcome.f4.title', desc: 'welcome.f4.desc' },
] as const

/** Public landing for signed-out visitors. */
function Welcome() {
  const { t } = useI18n()
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-10 px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:max-w-5xl lg:px-12 lg:pt-10">
      <header className="flex items-center justify-between gap-4">
        <span className="font-display text-3xl font-extrabold tracking-tight">{t('app.name')}</span>
        <QuickPrefs />
      </header>

      <main className="flex flex-1 flex-col gap-10 lg:flex-none">
        <section className="flex flex-1 flex-col justify-center gap-8 lg:flex-none lg:py-16">
          <div className="flex flex-col gap-4">
            <h1 className="font-display text-5xl font-extrabold tracking-tight lg:text-7xl">
              {t('welcome.title')}
            </h1>
            <p className="text-lg text-muted-foreground lg:max-w-xl">{t('welcome.subtitle')}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              search={{ mode: 'signup' }}
              className="rounded-full bg-primary px-8 py-4 text-center text-lg font-extrabold text-primary-foreground no-underline hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              {t('welcome.cta')}
            </Link>
            <Link
              to="/login"
              className="rounded-full border border-input px-8 py-4 text-center text-lg font-extrabold text-foreground no-underline hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              {t('welcome.login')}
            </Link>
          </div>
        </section>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ Icon, title, desc }) => (
            <li key={title} className="flex flex-col gap-2 rounded-2xl border border-input p-4">
              <Icon className="size-6 text-[var(--lagoon)]" strokeWidth={2.25} aria-hidden="true" />
              <h2 className="font-display text-lg font-extrabold">{t(title)}</h2>
              <p className="text-sm text-muted-foreground">{t(desc)}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="mt-auto flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="font-display font-bold">{t('app.name')}</span>
        <p>{t('login.tagline')}</p>
      </footer>
    </div>
  )
}
