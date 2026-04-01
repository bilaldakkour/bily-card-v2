import clsx from 'clsx'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx('card-shell card-base p-4 transition-colors duration-200', className)}>{children}</div>
}
