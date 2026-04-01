export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { AdminPageShell } from '@/components/admin/admin-page-shell'
import { listAdminProducts } from '@/features/admin/products.service'

export default async function AdminPricingPage() {
  const products = await listAdminProducts()

  return (
    <AdminPageShell
      title='نظرة عامة على التسعير'
      description='عرض مركزي للهامش والخصم مع انتقال مباشر إلى Product Manager لتعديل القيم والـ preview الفوري.'
    >
      <div className='card-shell overflow-x-auto p-0'>
        <table className='min-w-full text-right text-sm'>
          <thead className='bg-cyan-500/10 text-xs text-cyan-100'>
            <tr>
              <th className='px-3 py-2'>Product</th>
              <th className='px-3 py-2'>Kind</th>
              <th className='px-3 py-2'>Default Margin</th>
              <th className='px-3 py-2'>Count Margin</th>
              <th className='px-3 py-2'>Discount</th>
              <th className='px-3 py-2'>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p: any) => {
              const rule = p.pricingRule
              return (
                <tr key={String(p._id)} className='border-t border-cyan-400/10'>
                  <td className='px-3 py-3 font-semibold'>{p.name}</td>
                  <td className='px-3 py-3 text-xs text-slate-300'>{p.kind}</td>
                  <td className='px-3 py-3'>{rule?.defaultMarginPct ?? 15}%</td>
                  <td className='px-3 py-3'>{rule?.countMarginPct ?? 15}%</td>
                  <td className='px-3 py-3'>{rule?.isDiscountEnabled ? `${rule.customerDiscountPct ?? 0}%` : '0%'}</td>
                  <td className='px-3 py-3'>
                    <Link href='/admin/products' className='text-cyan-300 underline'>
                      edit
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  )
}
