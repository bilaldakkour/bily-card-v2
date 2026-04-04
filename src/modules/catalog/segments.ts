import type { CatalogListItem } from '@/domain/types/catalog'
import { adminCatalogCategories } from '@/modules/catalog/categories'

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
}

const segmentConfigs: Record<Exclude<CatalogSegment, 'top'>, SegmentConfig> = {
  apps: {
    title: 'التطبيقات',
    subtitle: 'أفضل التطبيقات والخدمات الرقمية المتوفرة الآن',
    accent: 'cyan',
  },
  games: {
    title: 'الألعاب',
    subtitle: 'عروض وألعاب مطلوبة داخل Bily Card',
    accent: 'violet',
  },
  cards: {
    title: 'البطاقات',
    subtitle: 'بطاقات رقمية متنوعة ومناسبة للشحن السريع',
    accent: 'amber',
  },
  wallets: {
    title: 'المحافظ',
    subtitle: 'منتجات المحافظ والتحويلات الرقمية الأكثر طلبًا',
    accent: 'cyan',
  },
  balance: {
    title: 'الرصيد',
    subtitle: 'خدمات الرصيد والشحن المباشر المعروضة الآن',
    accent: 'violet',
  },
  social: {
    title: 'السوشيال ميديا',
    subtitle: 'خدمات وتطبيقات السوشيال ميديا الأكثر مبيعًا',
    accent: 'amber',
  },
  entertainment: {
    title: 'الترفيه',
    subtitle: 'أقسام الترفيه والاشتراكات الترفيهية المميزة',
    accent: 'violet',
  },
  accounts: {
    title: 'الحسابات والاشتراكات',
    subtitle: 'حسابات واشتراكات جاهزة بتسليم سريع',
    accent: 'cyan',
  },
}

const categoryAliases: Record<Exclude<CatalogSegment, 'top'>, string[]> = {
  cards: [adminCatalogCategories[0], 'البطاقات', 'cards', 'card'],
  apps: [adminCatalogCategories[1], 'التطبيقات', 'apps', 'app'],
  games: [adminCatalogCategories[2], 'الألعاب', 'games', 'game'],
  wallets: [adminCatalogCategories[3], 'المحافظ', 'wallets', 'wallet'],
  balance: [adminCatalogCategories[4], 'الرصيد', 'balance'],
  social: [adminCatalogCategories[5], 'السوشيال ميديا', 'social media', 'social'],
  entertainment: [adminCatalogCategories[6], 'الترفيه', 'entertainment'],
  accounts: [adminCatalogCategories[7], 'الحسابات والاشتراكات', 'accounts', 'account'],
}

function normalizeCategoryKey(value: string | null | undefined) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

const normalizedCategorySegmentMap = new Map<string, Exclude<CatalogSegment, 'top'>>()

for (const [segment, aliases] of Object.entries(categoryAliases) as Array<
  [Exclude<CatalogSegment, 'top'>, string[]]
>) {
  for (const alias of aliases) {
    normalizedCategorySegmentMap.set(normalizeCategoryKey(alias), segment)
  }
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

export function resolveCatalogSegmentFromCategory(category: string | null | undefined) {
  return normalizedCategorySegmentMap.get(normalizeCategoryKey(category)) ?? null
}

export function getProductsForSegment(products: CatalogListItem[], segment: CatalogSegment) {
  if (segment === 'top') return products

  return products.filter((product) => resolveCatalogSegmentFromCategory(product.category) === segment)
}
