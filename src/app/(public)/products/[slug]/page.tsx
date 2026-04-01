export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { MobileProductCloseButton } from '@/components/product/mobile-product-close-button'
import { ProductPopup } from '@/components/product/product-popup'
import { getCatalogDetailBySlug } from '@/modules/catalog/service'

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getCatalogDetailBySlug(params.slug)
  if (!product) notFound()

  return (
    <div className='product-detail-shell gap-4 lg:gap-6 xl:gap-7'>
      <section className='product-hero-shell product-identity-panel overflow-hidden p-0 max-lg:min-h-[100dvh] max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none lg:min-h-0'>
        <div className='relative min-h-[100dvh] overflow-hidden max-lg:rounded-none sm:h-auto sm:min-h-0 sm:rounded-[28px] lg:min-h-[calc(100dvh-10rem)]'>
          {product.thumbnail ? (
            <img
              src={product.thumbnail}
              alt={product.name}
              className='absolute inset-0 h-full w-full scale-105 object-cover opacity-45 saturate-125 sm:hidden'
            />
          ) : null}
          <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.08),transparent_42%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.08),transparent_36%),linear-gradient(180deg,rgba(18,15,34,0.04),rgba(8,12,24,0.72))]' />
          <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,18,0),rgba(4,8,18,0.55)_34%,rgba(4,8,18,0.72))]' />
          {product.thumbnail ? (
            <div className='pointer-events-none absolute left-1/2 top-[92px] z-[1] h-[240px] w-[240px] -translate-x-1/2 overflow-hidden rounded-full opacity-28 blur-[0.5px] sm:hidden'>
              <img
                src={product.thumbnail}
                alt=''
                aria-hidden='true'
                className='h-full w-full object-cover'
              />
            </div>
          ) : null}
          <div className='relative z-10 flex min-h-[100dvh] flex-col px-0 pb-3 pt-2 sm:min-h-0 sm:space-y-4 sm:p-6 lg:min-h-[calc(100dvh-10rem)] lg:px-7 lg:pb-7 lg:pt-7 xl:px-8'>
            <div className='space-y-3 sm:space-y-4'>
              <div className='grid gap-3 sm:gap-5 lg:grid-cols-[160px_1fr] lg:items-start xl:grid-cols-[176px_1fr]'>
                <div className='product-image-frame mx-auto hidden w-full max-w-[132px] overflow-hidden rounded-[26px] sm:block lg:max-w-[160px] xl:max-w-[176px]'>
                  <img
                    src={product.thumbnail ?? '/test.jpg'}
                    alt={product.name}
                    className='aspect-square w-full object-cover'
                  />
                </div>

                <div className='space-y-2.5 text-center lg:text-right'>
                  <div className='lg:hidden'>
                    <div className='flex items-start justify-between gap-3' dir='ltr'>
                      <div className='min-w-0 flex-1 text-left'>
                        <h1 className='truncate text-[1.65rem] font-black leading-tight text-white'>{product.name}</h1>
                      </div>
                      <MobileProductCloseButton />
                    </div>
                    <p className='mt-3 text-center text-[14px] leading-7 text-slate-100/90'>
                      {product.description || 'منتج شحن رقمي سريع وآمن.'}
                    </p>
                  </div>
                  <div className='hidden lg:block'>
                    <div className='product-meta-row max-lg:items-start'>
                      <span className='product-overview-chip px-3 py-1 text-xs text-cyan-100'>{product.category}</span>
                      <span
                        className={`product-overview-chip px-3 py-1 text-xs ${
                          product.available ? 'stock-chip-in' : 'stock-chip-out'
                        }`}
                      >
                        {product.available ? 'متوفر' : 'غير متوفر'}
                      </span>
                    </div>
                    <h1 className='mt-2 text-lg font-black leading-tight text-white sm:text-2xl md:text-3xl'>{product.name}</h1>
                    <p className='mx-auto mt-2 line-clamp-3 max-w-[60ch] text-[11px] leading-5 text-slate-200/90 sm:text-sm sm:leading-7 lg:mx-0'>
                      {product.description || 'منتج شحن رقمي سريع وآمن.'}
                    </p>
                  </div>

                  {product.kind === 'package' ? (
                    <div className='hidden gap-2 sm:grid sm:grid-cols-2 xl:grid-cols-4'>
                      {product.packages.slice(0, 4).map((pkg) => (
                        <div key={pkg.key} className='product-quick-stat p-3 text-right'>
                          <div className='text-sm font-semibold text-white'>{pkg.label}</div>
                          <div className='mt-1 text-lg font-extrabold text-cyan-300'>${pkg.finalPrice.toFixed(2)}</div>
                          <div className={`mt-1 text-xs ${pkg.available ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {pkg.available ? 'متوفر الآن' : 'نفذ المخزون'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {product.kind === 'count' && product.count ? (
                    <div className='hidden gap-2 sm:grid sm:grid-cols-3 xl:max-w-[760px]'>
                      <div className='product-quick-stat p-3 text-sm'>
                        الحد الأدنى
                        <div className='mt-1 font-bold text-cyan-300'>{product.count.min}</div>
                      </div>
                      <div className='product-quick-stat p-3 text-sm'>
                        الحد الأعلى
                        <div className='mt-1 font-bold text-cyan-300'>{product.count.max}</div>
                      </div>
                      <div className='product-quick-stat p-3 text-sm'>
                        سعر الوحدة
                        <div className='mt-1 font-bold text-cyan-300'>${Number(product.count.unitPrice).toFixed(4)}</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className='relative z-10 mt-5 lg:hidden'>
              <ProductPopup product={product} mobileStandalone />
            </div>
          </div>
        </div>
      </section>

      <div className='purchase-panel hidden lg:block'>
        <ProductPopup product={product} />
      </div>
    </div>
  )
}
