import { BilySpotlightSection } from '@/components/home/BilySpotlightSection'
import { getCatalogList } from '@/modules/catalog/service'
import { getCatalogSegmentMeta, getProductsForSegment } from '@/modules/catalog/segments'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const products = await getCatalogList()

  const topProducts = getProductsForSegment(products, 'top')
  const topPackages = products.filter((product) => product.kind === 'package').slice(0, 9)
  const topCards = getProductsForSegment(products, 'cards')

  return (
    <div className='-mt-6 bg-transparent text-white sm:mt-0 sm:p-4 lg:p-5 xl:p-6'>
      <div className='mx-auto max-w-[1200px] px-0 text-right sm:px-4'>
        <div className='home-shell-premium'>
          <div className='home-stack'>
          <BilySpotlightSection {...getCatalogSegmentMeta('top')} items={topProducts} />
          <BilySpotlightSection
            title='الباقات الأكثر مبيعاً'
            subtitle='باقات جاهزة للشراء السريع والتسليم المباشر'
            accent='violet'
            items={topPackages}
          />
          <BilySpotlightSection
            title='البطاقات الأكثر مبيعاً'
            subtitle='بطاقات رقمية مشهورة ومناسبة للشحن الفوري'
            accent='amber'
            items={topCards}
          />
          </div>
        </div>
      </div>
    </div>
  )
}
