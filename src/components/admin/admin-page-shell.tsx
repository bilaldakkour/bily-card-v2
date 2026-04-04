import type { ReactNode } from 'react'

export function AdminPageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className='admin-page-shell space-y-4'>
      <div className='admin-page-shell-head admin-hero-panel panel-soft-surface rounded-[24px] p-4 sm:p-5'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div className='space-y-1.5'>
            <h1 className='admin-page-title text-xl font-black text-white sm:text-[1.9rem]'>{title}</h1>
            {description ? <p className='admin-page-description max-w-3xl text-sm leading-6 text-slate-300'>{description}</p> : null}
          </div>
          {actions ? <div className='admin-action-cluster sm:justify-end'>{actions}</div> : null}
        </div>
      </div>

      {children}
    </section>
  )
}

export function AdminStatGrid({ children }: { children: ReactNode }) {
  return <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>{children}</div>
}

export function AdminStatCard({
  label,
  value,
  tone = 'cyan',
}: {
  label: string
  value: string
  tone?: 'cyan' | 'amber' | 'emerald' | 'rose'
}) {
  const toneClass =
    tone === 'amber'
      ? 'text-amber-300'
      : tone === 'emerald'
        ? 'text-emerald-300'
        : tone === 'rose'
          ? 'text-rose-300'
          : 'text-cyan-300'

  return (
    <div className='admin-kpi-card card-shell p-4'>
      <div className='text-xs text-slate-400'>{label}</div>
      <div className={`admin-kpi-value mt-2 ${toneClass}`}>{value}</div>
      <div className='admin-kpi-meta mt-2'>Quick status snapshot</div>
    </div>
  )
}
