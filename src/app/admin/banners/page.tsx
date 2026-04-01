export const dynamic = 'force-dynamic'

import { AdminBannersManager } from '@/components/admin/admin-banners-manager'
import { listHomeBanners } from '@/features/home/banner.service'

export default async function AdminBannersPage() {
  const banners = await listHomeBanners()
  return <AdminBannersManager initialBanners={banners} />
}
