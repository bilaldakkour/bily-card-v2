import { ProductCard } from '@/components/catalog/product-card'
import BilyHeroSlider from '@/components/home/BilyHeroSlider'
import BilyQuickCategoriesBar from '@/components/layout/BilyQuickCategoriesBar'
import { getHomeActiveBanners } from '@/features/home/banner.service'
import { getCatalogList } from '@/modules/catalog/service'
import type { CatalogListItem } from '@/domain/types/catalog'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [banners, products] = await Promise.all([
    getHomeActiveBanners().catch(() => []),
    getCatalogList().catch(() => []),
  ])

  const bestSellers = products.filter((product) => product.available).slice(0, 8)

  const sectionGroups = {
    games: groupProductsBySegment(products, 'games').slice(0, 8),
    apps: groupProductsBySegment(products, 'apps').slice(0, 8),
    cards: groupProductsBySegment(products, 'cards').slice(0, 8),
    wallets: groupProductsBySegment(products, 'wallets').slice(0, 8),
    balance: groupProductsBySegment(products, 'balance').slice(0, 8),
    social: groupProductsBySegment(products, 'social').slice(0, 8),
    entertainment: groupProductsBySegment(products, 'entertainment').slice(0, 8),
    accounts: groupProductsBySegment(products, 'accounts').slice(0, 8),
  }

  return (
    <div className='storefront-main storefront-home-main dailycard-home-main'>
      <BilyHeroSlider banners={banners} />
      <BilyQuickCategoriesBar />

      <div className='storefront-sections-stack'>
        <StorefrontProductSection
          id='best-sellers-section'
          kicker={'\u0627\u0644\u0623\u0648\u0636\u062d \u0627\u0644\u0622\u0646'}
          title={'\u0627\u0644\u0623\u0643\u062b\u0631 \u0645\u0628\u064a\u0639\u064b\u0627'}
          subtitle={'\u0623\u0643\u062b\u0631 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0637\u0644\u0628\u064b\u0627 \u0648\u0623\u0648\u0636\u062d\u0647\u0627 \u0639\u0631\u0636\u064b\u0627 \u0641\u064a \u0627\u0644\u0648\u0627\u062c\u0647\u0629.'}
          products={bestSellers}
        />

        <StorefrontProductSection
          id='games-section'
          kicker={'\u0639\u0627\u0644\u0645 \u0627\u0644\u0644\u0639\u0628'}
          title={'\u0627\u0644\u0623\u0644\u0639\u0627\u0628'}
          subtitle={'\u0628\u0627\u0642\u0627\u062a \u0648\u0645\u0646\u062a\u062c\u0627\u062a \u0644\u0644\u062c\u064a\u0645\u064a\u0646\u063a \u0628\u0625\u064a\u0642\u0627\u0639 \u0639\u0631\u0636 \u0645\u0631\u062a\u0628 \u0648\u0645\u062a\u0646\u0641\u0633.'}
          products={sectionGroups.games}
        />

        <StorefrontProductSection
          id='apps-section'
          kicker={'\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a \u0648\u0623\u062f\u0648\u0627\u062a'}
          title={'\u0627\u0644\u062a\u0637\u0628\u064a\u0642\u0627\u062a'}
          subtitle={'\u062a\u062c\u0645\u064a\u0639 \u0648\u0627\u0636\u062d \u0644\u0623\u0628\u0631\u0632 \u0627\u0644\u062a\u0637\u0628\u064a\u0642\u0627\u062a \u0648\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a \u0627\u0644\u0631\u0642\u0645\u064a\u0629.'}
          products={sectionGroups.apps}
        />

        <StorefrontProductSection
          id='cards-section'
          kicker={'\u0634\u062d\u0646 \u0648\u0628\u0637\u0627\u0642\u0627\u062a'}
          title={'\u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a'}
          subtitle={'\u0643\u0631\u0648\u062a \u0631\u0642\u0645\u064a\u0629 \u0648\u0628\u0637\u0627\u0642\u0627\u062a \u0634\u062d\u0646 \u0645\u062f\u0645\u0648\u062c\u0629 \u0636\u0645\u0646 \u0646\u0641\u0633 \u0627\u0644\u0647\u0648\u064a\u0629 \u0627\u0644\u0628\u0635\u0631\u064a\u0629.'}
          products={sectionGroups.cards}
        />

        <StorefrontProductSection
          id='wallets-section'
          kicker={'\u0645\u062d\u0627\u0641\u0638 \u0648\u0634\u062d\u0646'}
          title={'\u0627\u0644\u0645\u062d\u0627\u0641\u0638'}
          subtitle={'\u062a\u062c\u0645\u064a\u0639 \u0648\u0627\u0636\u062d \u0644\u0644\u0645\u062d\u0627\u0641\u0638 \u0648\u0639\u0631\u0648\u0636 \u0627\u0644\u0634\u062d\u0646 \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u0647\u0627.'}
          products={sectionGroups.wallets}
        />

        <StorefrontProductSection
          id='balance-section'
          kicker={'\u0631\u0635\u064a\u062f \u0648\u062a\u0639\u0628\u0626\u0629'}
          title={'\u0627\u0644\u0631\u0635\u064a\u062f'}
          subtitle={'\u0631\u0635\u064a\u062f \u0648\u0623\u0631\u0642\u0627\u0645 \u062a\u0639\u0628\u0626\u0629 \u0648\u062d\u0632\u0645 \u0633\u0631\u064a\u0639\u0629 \u0641\u064a \u0642\u0633\u0645 \u0645\u0631\u062a\u0628 \u0648\u0645\u0628\u0627\u0634\u0631.'}
          products={sectionGroups.balance}
        />

        <StorefrontProductSection
          id='social-section'
          kicker={'\u0645\u062c\u062a\u0645\u0639 \u0648\u0634\u0628\u0643\u0627\u062a'}
          title={'\u0627\u0644\u0633\u0648\u0634\u064a\u0627\u0644 \u0645\u064a\u062f\u064a\u0627'}
          subtitle={'\u0623\u0628\u0631\u0632 \u0628\u0627\u0642\u0627\u062a \u0648\u062e\u062f\u0645\u0627\u062a \u0627\u0644\u0633\u0648\u0634\u064a\u0627\u0644 \u0645\u064a\u062f\u064a\u0627 \u0627\u0644\u0645\u062a\u0627\u062d\u0629 \u062d\u0627\u0644\u064a\u064b\u0627.'}
          products={sectionGroups.social}
        />

        <StorefrontProductSection
          id='entertainment-section'
          kicker={'\u0645\u062a\u0639\u0629 \u0648\u0645\u062d\u062a\u0648\u0649'}
          title={'\u0627\u0644\u062a\u0631\u0641\u064a\u0647'}
          subtitle={'\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a \u062a\u0631\u0641\u064a\u0647\u064a\u0629 \u0648\u0645\u0646\u062a\u062c\u0627\u062a \u0645\u062d\u062a\u0648\u0649 \u0641\u064a \u0639\u0631\u0636 \u0648\u0627\u0636\u062d.'}
          products={sectionGroups.entertainment}
        />

        <StorefrontProductSection
          id='accounts-section'
          kicker={'\u062d\u0633\u0627\u0628\u0627\u062a \u0648\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a'}
          title={'\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0648\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a'}
          subtitle={'\u0642\u0633\u0645 \u0645\u062e\u0635\u0635 \u0644\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0648\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629 \u0628\u0646\u0641\u0633 \u0625\u064a\u0642\u0627\u0639 \u0627\u0644\u0647\u0648\u0645.'}
          products={sectionGroups.accounts}
        />

        <section className='storefront-bottom-grid' dir='rtl'>
          <article id='about-section' className='storefront-info-card storefront-bottom-card'>
            <span className='storefront-info-kicker'>{'\u0645\u0646 \u0646\u062d\u0646'}</span>
            <h3 className='storefront-info-title'>
              {'\u0628\u064a\u0644\u064a \u0643\u0627\u0631\u062f \u0648\u0627\u062c\u0647\u0629 \u0631\u0642\u0645\u064a\u0629 \u0645\u0631\u062a\u0628\u0629'}
            </h3>
            <p className='storefront-info-copy'>
              {
                '\u0646\u062c\u0645\u0639 \u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a \u0648\u0627\u0644\u0623\u0644\u0639\u0627\u0628 \u0648\u0627\u0644\u062a\u0637\u0628\u064a\u0642\u0627\u062a \u0641\u064a \u062a\u062c\u0631\u0628\u0629 \u0623\u0648\u0636\u062d \u0648\u0623\u0633\u0631\u0639 \u0645\u0639 \u0639\u0631\u0636 \u0641\u0627\u062e\u0631 \u0648\u0646\u0641\u0633 \u0647\u0648\u064a\u0629 \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0641\u064a \u0643\u0644 \u0627\u0644\u0635\u0641\u062d\u0629.'
              }
            </p>
          </article>

          <article id='contact-section' className='storefront-info-card storefront-bottom-card'>
            <span className='storefront-info-kicker'>{'\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627'}</span>
            <h3 className='storefront-info-title'>
              {'\u062f\u0639\u0645 \u0633\u0631\u064a\u0639 \u0648\u0642\u0646\u0648\u0627\u062a \u0648\u0627\u0636\u062d\u0629'}
            </h3>
            <p className='storefront-info-copy'>
              {
                '\u0648\u0627\u062a\u0633\u0627\u0628 \u0648\u062a\u064a\u0643 \u062a\u0648\u0643 \u0648\u0642\u0646\u0648\u0627\u062a \u062f\u0639\u0645 \u0645\u062c\u0647\u0632\u0629 \u0644\u062a\u0628\u0642\u0649 \u0643\u0644 \u0646\u0642\u0637\u0629 \u0641\u064a \u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0627\u0636\u062d\u0629 \u0648\u0645\u062a\u0627\u062d\u0629 \u0645\u0646 \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f.'
              }
            </p>
          </article>
        </section>

        <footer id='footer-signature' className='storefront-signature' dir='rtl'>
          <div className='storefront-signature-line' />
          <div className='storefront-signature-copy'>
            <span>{'Bily Card'}</span>
            <span>{'\u0627\u0644\u0645\u062a\u062c\u0631 \u0627\u0644\u0631\u0642\u0645\u064a'}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

function StorefrontProductSection({
  id,
  kicker,
  title,
  subtitle,
  products,
}: {
  id: string
  kicker: string
  title: string
  subtitle: string
  products: CatalogListItem[]
}) {
  return (
    <section id={id} className='storefront-commerce-section scroll-mt-[108px]'>
      <div className='storefront-commerce-header' dir='rtl'>
        <span className='storefront-commerce-kicker'>{kicker}</span>
        <h2 className='storefront-commerce-title'>{title}</h2>
        <p className='storefront-commerce-subtitle'>{subtitle}</p>
      </div>

      {products.length > 0 ? (
        <div className='product-grid storefront-commerce-grid'>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className='storefront-empty-section' dir='rtl'>
          {'\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u062a\u062c\u0627\u062a \u0645\u0639\u0631\u0648\u0636\u0629 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0642\u0633\u0645 \u062d\u0627\u0644\u064a\u064b\u0627.'}
        </div>
      )}
    </section>
  )
}

function groupProductsBySegment(
  products: CatalogListItem[],
  segment:
    | 'games'
    | 'apps'
    | 'cards'
    | 'wallets'
    | 'balance'
    | 'social'
    | 'entertainment'
    | 'accounts'
) {
  const matchers: Record<typeof segment, RegExp[]> = {
    games: [
      /game/i,
      /\bpubg\b/i,
      /\bplaystation\b/i,
      /\bxbox\b/i,
      /\bps[0-9]?\b/i,
      /\bsteam\b/i,
      /\bnintendo\b/i,
      /\u0644\u0639\u0628/u,
      /\u0623\u0644\u0639\u0627\u0628/u,
      /\u0634\u062d\u0646/u,
    ],
    apps: [
      /app/i,
      /application/i,
      /subscription/i,
      /netflix/i,
      /spotify/i,
      /youtube/i,
      /\u062a\u0637\u0628\u064a\u0642/u,
      /\u062a\u0637\u0628\u064a\u0642\u0627\u062a/u,
      /\u0627\u0634\u062a\u0631\u0627\u0643/u,
    ],
    cards: [
      /card/i,
      /gift/i,
      /top ?up/i,
      /wallet/i,
      /\u0628\u0637\u0627\u0642/u,
      /\u0628\u0637\u0627\u0642\u0627\u062a/u,
      /\u0643\u0631\u062a/u,
      /\u0645\u062d\u0641\u0638/u,
      /\u0631\u0635\u064a\u062f/u,
    ],
    wallets: [
      /wallet/i,
      /pay/i,
      /paypal/i,
      /binance/i,
      /webmoney/i,
      /\u0645\u062d\u0641\u0638/u,
      /\u0645\u062d\u0627\u0641\u0638/u,
      /\u062f\u0641\u0639/u,
    ],
    balance: [
      /balance/i,
      /credit/i,
      /recharge/i,
      /top ?up/i,
      /\u0631\u0635\u064a\u062f/u,
      /\u062a\u0639\u0628\u0626/u,
      /\u0623\u0631\u0642\u0627\u0645/u,
    ],
    social: [
      /social/i,
      /tiktok/i,
      /instagram/i,
      /facebook/i,
      /snap/i,
      /whatsapp/i,
      /telegram/i,
      /\u0633\u0648\u0634\u064a\u0627\u0644/u,
      /\u062a\u0648\u0627\u0635\u0644/u,
    ],
    entertainment: [
      /entertainment/i,
      /music/i,
      /movie/i,
      /stream/i,
      /netflix/i,
      /spotify/i,
      /shahid/i,
      /youtube/i,
      /\u062a\u0631\u0641\u064a\u0647/u,
      /\u0645\u062d\u062a\u0648\u0649/u,
    ],
    accounts: [
      /account/i,
      /subscription/i,
      /premium/i,
      /license/i,
      /\u062d\u0633\u0627\u0628/u,
      /\u062d\u0633\u0627\u0628\u0627\u062a/u,
      /\u0627\u0634\u062a\u0631\u0627\u0643/u,
      /\u0628\u0631\u064a\u0645\u064a\u0648\u0645/u,
    ],
  }

  const scored = products.map((product) => {
    const haystack = `${product.category} ${product.name} ${product.description}`.toLowerCase()
    const score = matchers[segment].reduce((total, matcher) => total + (matcher.test(haystack) ? 1 : 0), 0)
    return { product, score }
  })

  const strongMatches = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (Number(b.product.available) !== Number(a.product.available)) {
        return Number(b.product.available) - Number(a.product.available)
      }
      return a.product.name.localeCompare(b.product.name)
    })
    .map((item) => item.product)

  return strongMatches
}
