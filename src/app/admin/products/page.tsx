export const dynamic = 'force-dynamic'

import { listAdminProducts } from '@/features/admin/products.service'
import { AdminProductsManager } from '@/components/admin/admin-products-manager'

export default async function AdminProductsPage() {
  const products = (await listAdminProducts()) as any

  return <AdminProductsManager initialProducts={products} />
}
