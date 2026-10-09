import { type ReactNode, useEffect, useState } from 'react'
import { cn } from '#/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-xl bg-foreground/10', className)}
    />
  )
}

/**
 * Renders its children only after a short delay, so fast loads don't flash a
 * skeleton for a single frame.
 */
export function Delayed({ ms = 150, children }: { ms?: number; children: ReactNode }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setShow(true), ms)
    return () => clearTimeout(id)
  }, [ms])
  return show ? children : null
}
