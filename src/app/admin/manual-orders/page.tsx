export const dynamic = 'force-dynamic'

import { AdminManualOrdersManager } from '@/components/admin/admin-manual-orders-manager'
import { getManualOrdersForAdmin } from '@/features/orders/service'
import { isMongoEnabled, isSupabaseProvider } from '@/modules/db/provider'
import { listSupabaseProducts } from '@/modules/supabase/catalog-store'
import { listSupabaseUsers } from '@/modules/supabase/commerce-store'

export default async function AdminManualOrdersPage() {
  const [initial, usersRaw, productsRaw] = isSupabaseProvider()
    ? await Promise.all([getManualOrdersForAdmin(), listSupabaseUsers(), listSupabaseProducts()])
    : isMongoEnabled()
      ? await import('@/modules/db/connection')
          .then(async ({ connectDb }) => {
            await connectDb()
            const { ProductModel, UserModel } = await import('@/domain/models')
            return Promise.all([
              getManualOrdersForAdmin(),
              UserModel.find({ isActive: true }).select({ name: 1, email: 1 }).sort({ name: 1, email: 1 }).lean(),
              ProductModel.find({ active: true }).select({ name: 1, slug: 1, kind: 1, packages: 1 }).sort({ name: 1 }).lean(),
            ])
          })
      : [[], [], []]

  const users = (usersRaw as any[]).map((user: any) => ({
    _id: String(user.userId ?? user._id),
    name: user.name,
    email: user.email,
  }))

  const products = (productsRaw as any[]).map((product: any) => ({
    _id: String(product._id),
    name: product.name,
    slug: product.slug,
    kind: product.kind,
    packages: (product.packages ?? []).map((pkg: any) => ({
      key: pkg.key,
      label: pkg.label,
      active: pkg.active,
      visible: pkg.visible,
    })),
  }))

  return <AdminManualOrdersManager initial={initial as any} users={users as any} products={products as any} />
}
