import { redirect } from 'next/navigation'
import { getSession } from '@/modules/security/session'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (session) redirect('/')

  return <main className='mx-auto flex min-h-screen w-full max-w-md items-center px-4'>{children}</main>
}

