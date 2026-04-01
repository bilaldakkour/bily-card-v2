export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { AdminPageShell } from '@/components/admin/admin-page-shell'
import { listAdminProducts } from '@/features/admin/products.service'

export default async function AdminStockPage() {
  const products = await listAdminProducts()

  return (
    <AdminPageShell
      title='نظرة عامة على المخزون'
      description='حالة المخزون العامة لكل منتج. التعديل التفصيلي للمخزون يتم من Product Manager (manualStock + package stock).'
    >
      <div className='grid gap-3 md:grid-cols-2'>
        {products.map((p: any) => {
          const lowStock = typeof p.manualStock === 'number' && p.manualStock >= 0 && p.manualStock <= 5
          return (
            <div key={String(p._id)} className='card-shell space-y-3 p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='font-semibold'>{p.name}</div>
                  <div className='text-xs text-slate-400'>{p.slug}</div>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    p.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {p.active ? 'active' : 'inactive'}
                </span>
              </div>

              <div className='grid gap-1 text-sm'>
                <div>kind: {p.kind}</div>
                <div>visible: {String(p.visible)}</div>
                <div>manualStock: {p.manualStock ?? 'provider-driven'}</div>
                <div>packages: {p.packages?.length ?? 0}</div>
              </div>

              {lowStock ? <p className='text-xs text-amber-300'>Low manual stock warning.</p> : null}

              <Link href='/admin/products' className='text-sm text-cyan-300 underline'>
                manage stock
              </Link>
            </div>
          )
        })}
      </div>
    </AdminPageShell>
  )
}
