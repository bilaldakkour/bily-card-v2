import Image from 'next/image'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import type { CatalogListItem } from '@/domain/types/catalog'

type Props = {
  product: CatalogListItem
  compact?: boolean
}

export function ProductCard({ product, compact = false }: Props) {
  return (
    <Card className='product-card-shell group relative flex h-full flex-col overflow-hidden p-0'>
      <div className='product-card-highlight absolute inset-x-0 top-0 h-1' />

      <div className='product-card-body flex h-full flex-col p-3 sm:p-4'>
        <div className='product-card-media-shell'>
          <div className='product-card-media'>
            {product.thumbnail ? (
              <Image
                src={product.thumbnail}
                alt={product.name}
                fill
                sizes='(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw'
                className='product-card-media-image object-cover transition duration-300'
              />
            ) : (
              <div className='product-card-media-fallback'>
                <span className='product-card-media-fallback-mark'>
                  {product.category.slice(0, 2)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className='product-card-meta'>
          <span className='product-chip px-2 py-0.5 text-[10px] text-cyan-100 sm:px-2.5 sm:py-1 sm:text-[11px]'>
            {product.category}
          </span>
          <span
            className={`product-chip px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px] ${
              product.available ? 'stock-chip-in' : 'stock-chip-out'
            }`}
          >
            {product.available ? 'متوفر' : 'غير متوفر'}
          </span>
        </div>

        <h3
          className={`product-card-title line-clamp-2 font-semibold ${
            compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
          }`}
        >
          {product.name}
        </h3>

        <div className='product-card-pricing mt-auto space-y-0'>
          <div className='product-card-price-label text-[10px] sm:text-[11px]'>السعر يبدأ من</div>
          <div className='product-card-price-value text-lg font-extrabold sm:text-xl'>
            ${product.finalPriceFrom.toFixed(2)}
          </div>
        </div>

        <div className='product-card-footer pt-2 sm:pt-3'>
          <Link
            href={`/products/${product.slug}`}
            className='product-card-cta btn-secondary mt-0.5 min-h-[2.15rem] w-full px-2.5 py-1.5 text-center text-xs transition group-hover:border-cyan-200/80 group-hover:text-cyan-50 sm:mt-1 sm:min-h-[2.5rem] sm:px-4 sm:py-2 sm:text-sm'
          >
            شراء الآن
          </Link>
        </div>
      </div>
    </Card>
  )
}
