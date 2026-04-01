export const dynamic = 'force-dynamic'

import { requireAdmin } from '@/modules/security/guards'
import { listAdminUsers } from '@/features/admin/users.service'
import { AdminUsersManager } from '@/components/admin/admin-users-manager'

type SearchParams = {
  q?: string
  role?: string
}

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin()

  const q = (searchParams.q ?? '').trim()
  const roleRaw = searchParams.role ?? 'all'
  const role = roleRaw === 'customer' || roleRaw === 'admin' ? roleRaw : 'all'

  const users = await listAdminUsers({ q, role })

  return (
    <section className='space-y-4'>
      <form className='card-shell grid gap-2 p-3 sm:grid-cols-3'>
        <input name='q' defaultValue={q} placeholder='Search name or email' className='input-shell sm:col-span-2' />
        <select name='role' defaultValue={role} className='input-shell'>
          <option value='all'>all roles</option>
          <option value='customer'>customer</option>
          <option value='admin'>admin</option>
        </select>
        <button className='btn-secondary sm:col-span-3' type='submit'>
          apply filter
        </button>
      </form>

      <AdminUsersManager initial={users as any} currentAdminId={admin.sub} />
    </section>
  )
}
