import { Link } from '@tanstack/react-router'
import { History, Settings, Timer } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MessageKey } from '#/lib/messages'
import { useI18n } from '#/lib/preferences'
import { QuickPrefs } from './quick-prefs'

const TABS = [
  { to: '/', label: 'nav.fast', Icon: Timer },
  { to: '/history', label: 'nav.history', Icon: History },
  { to: '/settings', label: 'nav.settings', Icon: Settings },
] as const satisfies readonly { to: string; label: MessageKey; Icon: unknown }[]

/**
 * Page frame for signed-in screens: a thumb-reachable tab bar on mobile and a
 * regular sidebar layout on desktop (lg+).
 */
export function AppShell({ title, children }: { title?: string; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="lg:flex lg:min-h-dvh">
      <SideNav />
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(4.5rem+max(0.25rem,calc(env(safe-area-inset-bottom)-1.5rem)))] lg:max-w-6xl lg:px-12 lg:pt-10 lg:pb-10">
        <header className="flex items-center justify-between gap-4">
          {title ? (
            <h1 className="font-display text-3xl font-extrabold tracking-tight lg:text-4xl">
              {title}
            </h1>
          ) : (
            // Pages without a title show the brand on mobile; desktop has it in the sidebar.
            <span className="font-display text-3xl font-extrabold tracking-tight lg:hidden">
              {t('app.name')}
            </span>
          )}
          <QuickPrefs className="ml-auto" />
        </header>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

function SideNav() {
  const { t } = useI18n()
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r border-input px-5 py-8 lg:flex">
      <span className="px-3 font-display text-3xl font-extrabold tracking-tight">
        {t('app.name')}
      </span>
      <nav>
        <ul className="flex flex-col gap-1">
          {TABS.map(({ to, label, Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: true }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-bold no-underline !text-muted-foreground hover:bg-muted/60 data-[status=active]:bg-muted data-[status=active]:!text-foreground"
              >
                <Icon className="size-5" strokeWidth={2.25} aria-hidden="true" />
                {t(label)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

/** Fixed tab bar, padded for the iOS home indicator. Mobile/tablet only. */
function BottomNav() {
  const { t } = useI18n()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-input bg-background/85 pb-[max(0.25rem,calc(env(safe-area-inset-bottom)-1.5rem))] backdrop-blur-md lg:hidden">
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: true }}
              className="flex flex-col items-center gap-1 pt-2 pb-1 text-xs font-bold no-underline !text-muted-foreground data-[status=active]:!text-[var(--lagoon)]"
            >
              <Icon className="size-6" strokeWidth={2.25} aria-hidden="true" />
              {t(label)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
