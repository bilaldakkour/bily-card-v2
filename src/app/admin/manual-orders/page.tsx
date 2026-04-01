export const dynamic = 'force-dynamic'

import { ProductModel, UserModel } from '@/domain/models'
import { AdminManualOrdersManager } from '@/components/admin/admin-manual-orders-manager'
import { getManualOrdersForAdmin } from '@/features/orders/service'
import { connectDb } from '@/modules/db/connection'

export default async function AdminManualOrdersPage() {
  await connectDb()

  const [initial, usersRaw, productsRaw] = await Promise.all([
    getManualOrdersForAdmin(),
    UserModel.find({ isActive: true }).select({ name: 1, email: 1 }).sort({ name: 1, email: 1 }).lean(),
    ProductModel.find({ active: true }).select({ name: 1, slug: 1, kind: 1, packages: 1 }).sort({ name: 1 }).lean(),
  ])

  const users = usersRaw.map((user: any) => ({
    _id: String(user._id),
    name: user.name,
    email: user.email,
  }))

  const products = productsRaw.map((product: any) => ({
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
