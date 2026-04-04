import { getHomeActiveBanners } from '@/features/home/banner.service'
import { getCatalogList } from '@/modules/catalog/service'
import { getSession } from '@/modules/security/session'
import BilyTopHeader from './BilyTopHeader'

export async function SiteHeader({ walletBalance = '$0.00' }: { walletBalance?: string }) {
  const [, catalogItems, banners] = await Promise.all([
    getSession(),
    getCatalogList().catch(() => []),
    getHomeActiveBanners().catch(() => []),
  ])

  const productSuggestions = catalogItems.slice(0, 120).map((item) => ({
    id: item.id,
    label: item.name,
    kind:
      item.category?.trim() ||
      (item.kind === 'count'
        ? '\u0644\u0639\u0628\u0629'
        : item.kind === 'manual'
          ? '\u062a\u0637\u0628\u064a\u0642'
          : '\u0645\u0646\u062a\u062c'),
    href: `/products/${item.slug}`,
    thumbnail: item.thumbnail,
  }))

  const baseSuggestions = [
    {
      id: 'cat-games',
      label: '\u0627\u0644\u0623\u0644\u0639\u0627\u0628',
      kind: '\u062a\u0635\u0646\u064a\u0641',
      href: '/products?segment=games',
      thumbnail: null,
    },
    {
      id: 'cat-apps',
      label: '\u0627\u0644\u062a\u0637\u0628\u064a\u0642\u0627\u062a',
      kind: '\u062a\u0635\u0646\u064a\u0641',
      href: '/products?segment=apps',
      thumbnail: null,
    },
    {
      id: 'cat-cards',
      label: '\u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a',
      kind: '\u062a\u0635\u0646\u064a\u0641',
      href: '/products?segment=cards',
      thumbnail: null,
    },
    {
      id: 'cat-products',
      label: '\u0643\u0644 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
      kind: '\u062a\u0635\u0641\u062d',
      href: '/products',
      thumbnail: null,
    },
  ]

  return (
    <BilyTopHeader
      searchItems={[...baseSuggestions, ...productSuggestions]}
      walletBalance={walletBalance}
      banners={banners}
    />
  )
}
