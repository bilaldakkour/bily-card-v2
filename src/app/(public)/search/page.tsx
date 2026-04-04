export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ProductCard } from '@/components/catalog/product-card'
import { getCatalogList } from '@/modules/catalog/service'
import { normalizeSearchText, searchCatalogItems } from '@/modules/search/utils'

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = normalizeSearchText(searchParams.q ?? '')
  const products = await getCatalogList()
  const filtered = q ? searchCatalogItems(products, q) : []

  return (
    <section className='storefront-subpage-shell space-y-4'>
      <div className='storefront-subpage-hero'>
        <span className='storefront-subpage-kicker'>Bily Card</span>
        <h1 className='storefront-subpage-title'>البحث</h1>
        <p className='storefront-subpage-copy'>نتائج موحّدة من نفس نسق المتجر الرئيسي، مع بحث مباشر داخل المنتجات.</p>
      </div>
      <form className='card-shell p-3' action='/search'>
        <input name='q' defaultValue={searchParams.q ?? ''} className='input-shell' placeholder='ابحث عن المنتج...' />
      </form>

      {!q ? (
        <div className='card-shell p-6 text-sm text-slate-300'>
          اكتب اسم المنتج للبدء، أو اذهب مباشرة إلى{' '}
          <Link href='/products' className='text-cyan-300 underline'>
            صفحة المنتجات
          </Link>
          .
        </div>
      ) : filtered.length === 0 ? (
        <div className='card-shell p-6 text-sm text-slate-300'>لا توجد نتائج مطابقة لـ &quot;{searchParams.q}&quot;.</div>
      ) : (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {filtered.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      )}
    </section>
  )
}

