import type { CatalogListItem } from '@/domain/types/catalog'

export type CatalogSegment =
  | 'top'
  | 'apps'
  | 'games'
  | 'cards'
  | 'wallets'
  | 'balance'
  | 'social'
  | 'entertainment'
  | 'accounts'

type SegmentConfig = {
  title: string
  subtitle: string
  accent: 'cyan' | 'violet' | 'amber'
  keywords: string[]
}

const segmentConfigs: Record<Exclude<CatalogSegment, 'top'>, SegmentConfig> = {
  apps: {
    title: 'التطبيقات',
    subtitle: 'أفضل التطبيقات والخدمات الرقمية المتوفرة الآن',
    accent: 'cyan',
    keywords: ['app', 'apps', 'application', 'applications', 'تطبيق', 'تطبيقات'],
  },
  games: {
    title: 'الألعاب',
    subtitle: 'عروض وألعاب مطلوبة داخل Bily Card',
    accent: 'violet',
    keywords: ['game', 'games', 'gaming', 'لعبة', 'ألعاب', 'العاب', 'شحن'],
  },
  cards: {
    title: 'البطاقات',
    subtitle: 'بطاقات رقمية متنوعة ومناسبة للشحن السريع',
    accent: 'amber',
    keywords: ['بطاق', 'card', 'gift', 'voucher', 'itunes', 'playstation', 'xbox'],
  },
  wallets: {
    title: 'المحافظ',
    subtitle: 'منتجات المحافظ والتحويلات الرقمية الأكثر طلبًا',
    accent: 'cyan',
    keywords: ['محفظ', 'wallet', 'wallets', 'pay', 'payment'],
  },
  balance: {
    title: 'الرصيد',
    subtitle: 'خدمات الرصيد والشحن المباشر المعروضة الآن',
    accent: 'violet',
    keywords: ['رصيد', 'balance', 'credit', 'topup', 'top-up'],
  },
  social: {
    title: 'السوشال ميديا',
    subtitle: 'خدمات وتطبيقات السوشال ميديا الأكثر مبيعًا',
    accent: 'amber',
    keywords: ['social', 'instagram', 'tiktok', 'facebook', 'telegram', 'whatsapp', 'سوشيال', 'ميديا'],
  },
  entertainment: {
    title: 'الترفيه',
    subtitle: 'أقسام الترفيه والاشتراكات الترفيهية المميزة',
    accent: 'violet',
    keywords: ['entertainment', 'stream', 'netflix', 'spotify', 'ترفيه', 'مشاهدة'],
  },
  accounts: {
    title: 'الحسابات والاشتراكات',
    subtitle: 'حسابات واشتراكات جاهزة بتسليم سريع',
    accent: 'cyan',
    keywords: ['account', 'accounts', 'subscription', 'subscriptions', 'حساب', 'اشتراك', 'اشتراكات'],
  },
}

export const storefrontCatalogSegments: Exclude<CatalogSegment, 'top'>[] = [
  'games',
  'apps',
  'cards',
  'wallets',
  'balance',
  'social',
  'entertainment',
  'accounts',
]

export function isCatalogSegment(value: string | undefined): value is CatalogSegment {
  if (!value) return false
  return value === 'top' || value in segmentConfigs
}

export function getCatalogSegmentMeta(segment: CatalogSegment) {
  if (segment === 'top') {
    return {
      title: 'المنتجات الأكثر مبيعًا',
      subtitle: 'اختيارات مطلوبة الآن داخل Bily Card',
      accent: 'cyan' as const,
    }
  }

  return segmentConfigs[segment]
}

export function getProductsForSegment(products: CatalogListItem[], segment: CatalogSegment) {
  if (segment === 'top') return products

  const { keywords } = segmentConfigs[segment]

  return products
    .filter((product) => {
      const haystack = `${product.name} ${product.category} ${product.description}`.toLowerCase()
      return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))
    })
}
