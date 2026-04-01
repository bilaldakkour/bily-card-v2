import { getHomeActiveBanners } from '@/features/home/banner.service'
import { getCatalogList } from '@/modules/catalog/service'
import { getSession } from '@/modules/security/session'
import BilyTopHeader from './BilyTopHeader'

export async function SiteHeader({ walletBalance = '$0.00' }: { walletBalance?: string }) {
  const [, catalogItems, banners] = await Promise.all([getSession(), getCatalogList(), getHomeActiveBanners()])

  const productSuggestions = catalogItems.slice(0, 120).map((item) => ({
    id: item.id,
    label: item.name,
    kind: item.category?.trim() || (item.kind === 'count' ? 'لعبة' : item.kind === 'manual' ? 'تطبيق' : 'منتج'),
    href: `/products/${item.slug}`,
    thumbnail: item.thumbnail,
  }))

  const baseSuggestions = [
    { id: 'cat-games', label: 'الألعاب', kind: 'تصنيف', href: '/products?segment=games', thumbnail: null },
    { id: 'cat-apps', label: 'التطبيقات', kind: 'تصنيف', href: '/products?segment=apps', thumbnail: null },
    { id: 'cat-cards', label: 'البطاقات', kind: 'تصنيف', href: '/products?segment=cards', thumbnail: null },
    { id: 'cat-products', label: 'كل المنتجات', kind: 'تصفح', href: '/products', thumbnail: null },
  ]

  return <BilyTopHeader searchItems={[...baseSuggestions, ...productSuggestions]} walletBalance={walletBalance} banners={banners} />
}
