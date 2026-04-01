export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getCatalogList } from '@/modules/catalog/service'

export default async function CategoriesPage() {
  const products = await getCatalogList()
  const grouped = products.reduce<Record<string, { total: number; available: number }>>((acc, item) => {
    const current = acc[item.category] ?? { total: 0, available: 0 }
    current.total += 1
    if (item.available) current.available += 1
    acc[item.category] = current
    return acc
  }, {})

  return (
    <section className='space-y-4'>
      <h1 className='text-2xl font-bold'>التصنيفات</h1>
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {Object.entries(grouped).map(([name, meta]) => (
          <Link
            key={name}
            href={`/products?category=${encodeURIComponent(name)}`}
            className='card-shell group space-y-2 border-cyan-300/20 p-4 transition hover:border-cyan-200/60'
          >
            <h2 className='font-semibold group-hover:text-cyan-100'>{name}</h2>
            <p className='text-sm text-slate-400'>{meta.total} منتجات</p>
            <p className='text-xs text-cyan-300'>{meta.available} متوفر الآن</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
