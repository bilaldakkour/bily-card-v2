export const dynamic = 'force-dynamic'
export const revalidate = 0

import { unstable_noStore as noStore } from 'next/cache'
import { notFound } from 'next/navigation'
import { CategoryProductCard } from '@/components/catalog/category-product-card'
import BilyQuickCategoriesBar from '@/components/layout/BilyQuickCategoriesBar'
import type { CatalogListItem } from '@/domain/types/catalog'
import { getCatalogList } from '@/modules/catalog/service'
import {
  getCatalogSegmentMeta,
  getProductsForSegment,
  isCatalogSegment,
  storefrontCatalogSegments,
} from '@/modules/catalog/segments'

type PageProps = {
  params: {
    segment: string
  }
}

export default async function CategorySegmentPage({ params }: PageProps) {
  noStore()

  const segment = params.segment

  if (!isCatalogSegment(segment)) {
    notFound()
  }

  const products = await getCatalogList({ fresh: true })

  if (segment === 'top') {
    const groupedSections = storefrontCatalogSegments
      .map((section) => ({
        segment: section,
        meta: getCatalogSegmentMeta(section),
        items: getProductsForSegment(products, section).slice(0, 6),
      }))
      .filter((section) => section.items.length > 0)

    return (
      <div className='storefront-main storefront-home-main storefront-category-main dailycard-home-main'>
        <BilyQuickCategoriesBar />

        <div className='storefront-sections-stack storefront-category-sections'>
          {groupedSections.map((section) => (
            <CategoryGroupSection
              key={section.segment}
              title={section.meta.title}
              subtitle={section.meta.subtitle}
              products={section.items}
            />
          ))}
        </div>
      </div>
    )
  }

  const meta = getCatalogSegmentMeta(segment)
  const items = getProductsForSegment(products, segment)

  return (
    <div className='storefront-main storefront-home-main storefront-category-main dailycard-home-main'>
      <BilyQuickCategoriesBar />

      <div className='storefront-sections-stack storefront-category-sections'>
        <CategoryGroupSection title={meta.title} subtitle={meta.subtitle} products={items} />
      </div>
    </div>
  )
}

function CategoryGroupSection({
  title,
  subtitle,
  products,
}: {
  title: string
  subtitle: string
  products: CatalogListItem[]
}) {
  return (
    <section className='storefront-commerce-section'>
      <div className='storefront-commerce-header' dir='rtl'>
        <span className='storefront-commerce-kicker'>Bily Card</span>
        <h2 className='storefront-commerce-title'>{title}</h2>
        <p className='storefront-commerce-subtitle'>{subtitle}</p>
      </div>

      {products.length > 0 ? (
        <div className='product-grid storefront-commerce-grid storefront-category-grid'>
          {products.map((product) => (
            <CategoryProductCard key={`${title}-${product.id}`} product={product} />
          ))}
        </div>
      ) : (
        <div className='storefront-empty-section' dir='rtl'>
          لا توجد منتجات معروضة في هذا القسم حاليًا.
        </div>
      )}
    </section>
  )
}
