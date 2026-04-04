import { ProductCard } from '@/components/catalog/product-card'
import type { CatalogListItem } from '@/domain/types/catalog'

export function BilySpotlightSection({
  title,
  subtitle,
  items,
  accent,
}: {
  title: string
  subtitle: string
  items: CatalogListItem[]
  accent: 'cyan' | 'violet' | 'amber'
}) {
  return (
    <section className={`home-spotlight-shell home-spotlight-shell-${accent} -mx-4 bg-transparent sm:mx-0 lg:px-4 lg:py-4 xl:px-5 xl:py-5`}>
      <div className='relative px-1 py-2 sm:px-0 lg:p-0'>
        <div className='home-spotlight-head relative'>
          <div className='space-y-1.5 text-center lg:text-right'>
            <span className='home-spotlight-kicker mx-auto lg:mx-0'>Bily Card</span>
            <h2 className='text-lg font-black text-white sm:text-2xl lg:text-[28px]'>{title}</h2>
            <p className='mx-auto max-w-[320px] text-[11px] text-slate-400 sm:max-w-none sm:text-sm lg:mx-0 lg:max-w-[560px]'>
              {subtitle}
            </p>
          </div>
        </div>

        {items.length > 0 ? (
          <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3.5 xl:grid-cols-4'>
            {items.map((product) => (
              <ProductCard key={`${title}-${product.id}`} product={product} />
            ))}
          </div>
        ) : (
          <div className='home-spotlight-empty rounded-2xl px-4 py-5 text-center text-sm text-slate-300'>
            لا توجد عناصر جاهزة للعرض في هذا القسم حاليًا
          </div>
        )}
      </div>
    </section>
  )
}
