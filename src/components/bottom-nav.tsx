import { Link } from '@tanstack/react-router'
import { History, Timer, User } from 'lucide-react'

const TABS = [
  { to: '/', label: 'Ayuno', Icon: Timer },
  { to: '/history', label: 'Historial', Icon: History },
  { to: '/profile', label: 'Perfil', Icon: User },
] as const

/** Thumb-reachable tab bar, padded for the iOS home indicator. */
export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-input bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: true }}
              className="flex flex-col items-center gap-1 py-3 text-xs font-bold no-underline !text-muted-foreground data-[status=active]:!text-[var(--lagoon)]"
            >
              <Icon className="size-6" strokeWidth={2.25} aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
