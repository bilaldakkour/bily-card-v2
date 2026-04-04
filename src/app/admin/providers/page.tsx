export const dynamic = 'force-dynamic'

import { AdminProvidersManager } from '@/components/admin/admin-providers-manager'
import { listProviderSettings } from '@/features/admin/providers.service'

export default async function AdminProvidersPage() {
  const initial = await listProviderSettings()

  return <AdminProvidersManager initial={initial as any} />
}
