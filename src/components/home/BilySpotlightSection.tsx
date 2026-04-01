import Link from 'next/link'
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
    <section className='home-spotlight-shell -mx-4 space-y-2.5 bg-transparent sm:mx-0 lg:px-4 lg:py-4 xl:px-5 xl:py-5'>
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
          <div className='home-spotlight-grid'>
            {items.map((product) => (
              <BilySpotlightCard key={`${title}-${product.id}`} product={product} accent={accent} />
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

function BilySpotlightCard({
  product,
  accent,
}: {
  product: CatalogListItem
  accent: 'cyan' | 'violet' | 'amber'
}) {
  const badgeClass =
    accent === 'violet'
      ? 'border-violet-200/40 bg-violet-500/75 text-white shadow-[0_6px_14px_rgba(139,92,246,0.35)]'
      : accent === 'amber'
        ? 'border-amber-200/40 bg-amber-500/75 text-white shadow-[0_6px_14px_rgba(245,158,11,0.35)]'
        : 'border-cyan-200/40 bg-cyan-500/75 text-white shadow-[0_6px_14px_rgba(6,182,212,0.35)]'

  return (
    <Link href={`/products/${product.slug}`} className='home-spotlight-card group lg:rounded-[18px] xl:rounded-[20px]'>
      <div className='home-spotlight-card-media'>
        <img
          src={product.thumbnail ?? fallbackThumb(product)}
          alt={product.name}
          className='h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.06]'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-[#090d18]/92 via-[#090d18]/10 to-transparent' />
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_34%)]' />

        <div className='absolute left-2 top-2 z-10'>
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black tracking-tight ${badgeClass}`}>
            {product.available ? 'فوري' : 'قريبًا'}
          </span>
        </div>
      </div>

      <div className='home-spotlight-card-body'>
        <h3 className='home-spotlight-card-title line-clamp-1'>{product.name}</h3>
        <p className='home-spotlight-card-copy line-clamp-2 min-h-[2rem] lg:min-h-[2.4rem]'>{homeCardExcerpt(product)}</p>
      </div>
    </Link>
  )
}

function fallbackThumb(product: CatalogListItem) {
  if (product.kind === 'package') return '/test1.jpg'
  return '/test.jpg'
}

function homeCardExcerpt(product: CatalogListItem) {
  const normalized = product.description.replace(/\s+/g, ' ').trim()
  if (normalized) return normalized
  return product.category
}
