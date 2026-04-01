import clsx from 'clsx'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx('input-shell', props.className)}
    />
  )
}
