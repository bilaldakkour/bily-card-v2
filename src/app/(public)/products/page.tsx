import Link from 'next/link'
import { ProductCard } from '@/components/catalog/product-card'
import { BilySpotlightSection } from '@/components/home/BilySpotlightSection'
import { getCatalogList } from '@/modules/catalog/service'
import { getCatalogSegmentMeta, getProductsForSegment, isCatalogSegment } from '@/modules/catalog/segments'
import { normalizeSearchText, searchCatalogItems } from '@/modules/search/utils'

export const dynamic = 'force-dynamic'

type SearchParams = {
  q?: string
  category?: string
  stock?: 'all' | 'in' | 'out'
  sort?: 'popular' | 'price_asc' | 'price_desc'
  segment?: string
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const products = await getCatalogList()

  if (isCatalogSegment(searchParams.segment) && searchParams.segment !== 'top') {
    const segment = searchParams.segment
    const items = getProductsForSegment(products, segment)
    const meta = getCatalogSegmentMeta(segment)

    return <BilySpotlightSection title={meta.title} subtitle={meta.subtitle} accent={meta.accent} items={items} />
  }

  const q = normalizeSearchText(searchParams.q ?? '')
  const category = searchParams.category ?? 'all'
  const stock = searchParams.stock ?? 'all'
  const sort = searchParams.sort ?? 'popular'

  const categories = Array.from(new Set(products.map((p) => p.category))).sort((a, b) => a.localeCompare(b))

  const queryFiltered = q ? searchCatalogItems(products, q) : products

  let filtered = queryFiltered.filter((product) => {
    if (category !== 'all' && product.category !== category) return false
    if (stock === 'in' && !product.available) return false
    if (stock === 'out' && product.available) return false
    return true
  })

  if (sort === 'price_asc') filtered = [...filtered].sort((a, b) => a.finalPriceFrom - b.finalPriceFrom)
  if (sort === 'price_desc') filtered = [...filtered].sort((a, b) => b.finalPriceFrom - a.finalPriceFrom)

  return (
    <section className='products-shell'>
      <div className='products-title-row'>
        <h1 className='text-2xl font-bold'>كل المنتجات</h1>
        <span className='text-xs text-slate-400'>{filtered.length} نتيجة</span>
      </div>

      <form className='products-toolbar card-shell grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5'>
        <label className='field-label sm:col-span-2 lg:col-span-2'>
          <span className='text-xs text-slate-400'>بحث</span>
          <input name='q' defaultValue={searchParams.q ?? ''} className='input-shell' placeholder='ابحث عن منتج...' />
        </label>

        <label className='field-label'>
          <span className='text-xs text-slate-400'>التصنيف</span>
          <select name='category' defaultValue={category} className='select-shell'>
            <option value='all'>كل التصنيفات</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className='field-label'>
          <span className='text-xs text-slate-400'>المخزون</span>
          <select name='stock' defaultValue={stock} className='select-shell'>
            <option value='all'>كل الحالات</option>
            <option value='in'>متوفر</option>
            <option value='out'>غير متوفر</option>
          </select>
        </label>

        <label className='field-label'>
          <span className='text-xs text-slate-400'>الترتيب</span>
          <select name='sort' defaultValue={sort} className='select-shell'>
            <option value='popular'>الأكثر طلبًا</option>
            <option value='price_asc'>السعر: الأقل أولًا</option>
            <option value='price_desc'>السعر: الأعلى أولًا</option>
          </select>
        </label>

        <button className='btn-primary mt-1 sm:col-span-2 lg:col-span-5' type='submit'>
          تطبيق الفلاتر
        </button>
      </form>

      {filtered.length === 0 ? (
        <div className='product-empty-shell card-shell p-6 text-center text-sm text-slate-300'>
          لا توجد منتجات بهذه الفلاتر.{' '}
          <Link href='/products' className='text-cyan-300 underline'>
            إعادة ضبط
          </Link>
        </div>
      ) : (
        <div className='product-grid-shell'>
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
