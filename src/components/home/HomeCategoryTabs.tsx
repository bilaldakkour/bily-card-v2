'use client'

import { useMemo, useState } from 'react'
import { ProductCard } from '@/components/catalog/product-card'
import type { CatalogListItem } from '@/domain/types/catalog'

type TabKey = 'top' | 'cards' | 'accounts'

type HomeCategoryTabsProps = {
  products: CatalogListItem[]
}

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'top', label: 'الأكثر مبيعًا' },
  { key: 'cards', label: 'البطاقات' },
  { key: 'accounts', label: 'الحسابات والاشتراكات' },
]

const cardsKeywords = ['بطاق', 'card', 'gift', 'voucher', 'itunes', 'playstation', 'xbox']
const accountsKeywords = ['حساب', 'اشتراك', 'account', 'subscription', 'social']

export default function HomeCategoryTabs({ products }: HomeCategoryTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('top')

  const topProducts = useMemo(() => products.slice(0, 8), [products])
  const cardsProducts = useMemo(
    () => products.filter((item) => cardsKeywords.some((keyword) => item.category.toLowerCase().includes(keyword))).slice(0, 8),
    [products],
  )
  const accountsProducts = useMemo(
    () => products.filter((item) => accountsKeywords.some((keyword) => item.category.toLowerCase().includes(keyword))).slice(0, 8),
    [products],
  )

  const visibleProducts = activeTab === 'top' ? topProducts : activeTab === 'cards' ? cardsProducts : accountsProducts

  return (
    <section className='mt-2.5 sm:mt-3'>
      <div className='-mx-1.5 overflow-x-auto px-1.5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:overflow-visible sm:px-0'>
        <div className='inline-flex min-w-full items-center gap-2 sm:min-w-0 sm:gap-2.5'>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key

            return (
              <button
                key={tab.key}
                type='button'
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 whitespace-nowrap rounded-lg border px-3.5 py-2 text-[12px] font-semibold leading-5 transition sm:text-sm ${
                  isActive
                    ? 'border-violet-300/40 bg-violet-500/18 text-violet-100 shadow-[0_0_14px_rgba(139,92,246,0.18)]'
                    : 'border-cyan-400/18 bg-[linear-gradient(180deg,rgba(18,24,42,.62),rgba(10,14,28,.78))] text-slate-200 hover:border-cyan-300/30'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className='mt-2.5 rounded-[20px] border border-cyan-400/10 bg-[linear-gradient(180deg,rgba(5,12,24,.86),rgba(4,9,20,.93))] p-2 sm:mt-3 sm:rounded-[28px] sm:p-4'>
        {visibleProducts.length > 0 ? (
          <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3.5 xl:grid-cols-4'>
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className='rounded-lg border border-cyan-400/10 bg-cyan-500/5 px-3 py-4 text-center text-xs text-slate-300 sm:text-sm'>
            لا توجد منتجات في هذا القسم حالياً
          </div>
        )}
      </div>
    </section>
  )
}
