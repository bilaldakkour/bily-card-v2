export const adminCatalogCategories = [
  'البطاقات',
  'التطبيقات',
  'الألعاب',
  'المحافظ',
  'الرصيد',
  'السوشيال ميديا',
  'الترفيه',
  'الحسابات والاشتراكات',
] as const

export type AdminCatalogCategory = (typeof adminCatalogCategories)[number]
