import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { listAdminUsers } from '@/features/admin/users.service'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''
    const roleRaw = searchParams.get('role') ?? 'all'
    const role = roleRaw === 'customer' || roleRaw === 'admin' ? roleRaw : 'all'

    const data = await listAdminUsers({ q, role })
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}
