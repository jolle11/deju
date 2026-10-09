import { Link, useNavigate } from '@tanstack/react-router'
import { History, LogOut, PanelLeftClose, PanelLeftOpen, Settings, Timer } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import type { MessageKey } from '#/lib/messages'
import { pb } from '#/lib/pb'
import { useI18n } from '#/lib/preferences'
import { QuickPrefs } from './quick-prefs'

const TABS = [
  { to: '/', label: 'nav.fast', Icon: Timer },
  { to: '/history', label: 'nav.history', Icon: History },
  { to: '/settings', label: 'nav.settings', Icon: Settings },
] as const satisfies readonly { to: string; label: MessageKey; Icon: unknown }[]

const SIDEBAR_STORAGE_KEY = 'deju-sidebar-collapsed'
let sidebarCollapsed = false

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
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(sidebarCollapsed)
  const [tooltipDismissed, setTooltipDismissed] = useState(false)

  useEffect(() => {
    try {
      sidebarCollapsed = localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
    } catch {}
    setCollapsed(sidebarCollapsed)
  }, [])

  function toggle() {
    const next = !collapsed
    sidebarCollapsed = next
    setCollapsed(next)
    setTooltipDismissed(true)
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
    } catch {}
  }

  const tooltipEvents = {
    onPointerEnter: () => setTooltipDismissed(false),
    onFocus: () => setTooltipDismissed(false),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') setTooltipDismissed(true)
    },
  }
  const toggleLabel = t(collapsed ? 'nav.expand' : 'nav.collapse')

  return (
    <aside
      className={`sticky top-0 z-20 hidden h-dvh shrink-0 flex-col gap-8 border-r border-input py-8 transition-[width,padding] duration-200 motion-reduce:transition-none lg:flex ${collapsed ? 'w-20 px-3' : 'w-64 px-5'}`}
    >
      <div
        className={`flex h-10 items-center ${collapsed ? 'justify-center' : 'justify-between pl-3'}`}
      >
        {!collapsed && (
          <span className="font-display text-3xl font-extrabold tracking-tight">
            {t('app.name')}
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          aria-controls="desktop-navigation"
          {...tooltipEvents}
          className="group/sidebar-action relative flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="size-5" aria-hidden="true" />
          )}
          <SidebarTooltip label={toggleLabel} dismissed={tooltipDismissed} />
        </button>
      </div>
      <nav id="desktop-navigation">
        <ul className="flex flex-col gap-1">
          {TABS.map(({ to, label, Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: true }}
                aria-label={t(label)}
                {...tooltipEvents}
                className={`group/sidebar-action relative flex items-center gap-3 rounded-xl py-2.5 font-bold no-underline !text-muted-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-muted data-[status=active]:!text-foreground ${collapsed ? 'justify-center px-0' : 'px-3'}`}
              >
                <Icon className="size-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                {collapsed ? (
                  <SidebarTooltip label={t(label)} dismissed={tooltipDismissed} />
                ) : (
                  t(label)
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <button
        type="button"
        aria-label={t('settings.logout')}
        {...tooltipEvents}
        onClick={() => {
          pb.authStore.clear()
          navigate({ to: '/welcome' })
        }}
        className={`group/sidebar-action relative mt-auto flex items-center gap-3 rounded-xl py-2.5 text-left font-bold text-red-500 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-red-400 ${collapsed ? 'justify-center px-0' : 'px-3'}`}
      >
        <LogOut className="size-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
        {collapsed ? (
          <SidebarTooltip label={t('settings.logout')} dismissed={tooltipDismissed} />
        ) : (
          t('settings.logout')
        )}
      </button>
    </aside>
  )
}

function SidebarTooltip({ label, dismissed }: { label: string; dismissed: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-sm font-semibold whitespace-nowrap text-popover-foreground shadow-md ${dismissed ? 'invisible' : 'invisible group-hover/sidebar-action:visible group-hover/sidebar-action:delay-100 group-focus-visible/sidebar-action:visible'} transition-[visibility] duration-0 motion-reduce:transition-none`}
    >
      {label}
    </span>
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
