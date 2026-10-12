import { clsx } from 'clsx'
import type { PropsWithChildren } from 'react'

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx('rounded-xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)]', className)}>
      {children}
    </div>
  )
}
