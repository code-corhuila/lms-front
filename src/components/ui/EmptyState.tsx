// Placeholder for a route this shell doesn't render itself — either a domain
// portal not yet composed as a remote, or a screen still under construction.
// See library-docs/12-ux-ui/navigation-map.md for what each screen will do.
interface EmptyStateProps {
  title: string
  description: string
  hu: string
}

export function EmptyState({ title, description, hu }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
      <span className="mt-4 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
        Implemented in {hu}
      </span>
    </div>
  )
}
