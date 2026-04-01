import clsx from 'clsx'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}

export function Button({ className, variant = 'primary', ...props }: Props) {
  return (
    <button
      className={clsx(
        'select-none whitespace-nowrap disabled:transform-none focus-visible:outline-none',
        variant === 'primary' ? 'btn-primary' : 'btn-secondary',
        className
      )}
      {...props}
    />
  )
}

