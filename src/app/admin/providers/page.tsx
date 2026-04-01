export const dynamic = 'force-dynamic'

import { connectDb } from '@/modules/db/connection'
import { ProviderSettingsModel } from '@/domain/models'
import { AdminProvidersManager } from '@/components/admin/admin-providers-manager'

export default async function AdminProvidersPage() {
  await connectDb()
  const initial = await ProviderSettingsModel.find({})
    .select({ provider: 1, baseUrl: 1, enabled: 1, timeoutMs: 1 })
    .lean()

  return <AdminProvidersManager initial={initial as any} />
}
