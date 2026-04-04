'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Heart, Sparkles, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { CatalogListItem } from '@/domain/types/catalog'

const FAVORITES_STORAGE_KEY = 'bilycard:public-favorites'

type Props = {
  product: CatalogListItem
}

function readFavorites() {
  if (typeof window === 'undefined') return new Set<string>()

  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(parsed) ? parsed.map((item) => String(item)) : [])
  } catch {
    return new Set<string>()
  }
}

function writeFavorites(values: Set<string>) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...values]))
  window.dispatchEvent(new CustomEvent('bilycard:favorites-updated'))
}

function getDeliveryBadge(product: CatalogListItem) {
  switch (product.kind) {
    case 'count':
      return { label: 'أوتوماتيك', tone: 'is-automatic', Icon: Sparkles }
    case 'manual':
      return { label: 'يدوي', tone: 'is-manual', Icon: Zap }
    default:
      return { label: 'فوري', tone: 'is-instant', Icon: Zap }
  }
}

export function CategoryProductCard({ product }: Props) {
  const [isFavorite, setIsFavorite] = useState(false)
  const router = useRouter()
  const deliveryBadge = useMemo(() => getDeliveryBadge(product), [product])

  useEffect(() => {
    const syncFavorites = () => {
      setIsFavorite(readFavorites().has(product.id))
    }

    syncFavorites()
    window.addEventListener('storage', syncFavorites)
    window.addEventListener('bilycard:favorites-updated', syncFavorites as EventListener)

    return () => {
      window.removeEventListener('storage', syncFavorites)
      window.removeEventListener('bilycard:favorites-updated', syncFavorites as EventListener)
    }
  }, [product.id])

  const toggleFavorite = () => {
    const favorites = readFavorites()

    if (favorites.has(product.id)) {
      favorites.delete(product.id)
      setIsFavorite(false)
    } else {
      favorites.add(product.id)
      setIsFavorite(true)
    }

    writeFavorites(favorites)
  }

  const openPurchasePopup = () => {
    router.push(`/products/${product.slug}`)
  }

  return (
    <div
      className='category-product-card product-card-shell group relative cursor-pointer overflow-hidden p-0'
      onClick={openPurchasePopup}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openPurchasePopup()
        }
      }}
      role='link'
      tabIndex={0}
    >
      <div className='category-flip-card'>
        <div className='category-flip-card-inner'>
          <article className='category-flip-face category-flip-front'>
            <div className='category-card-image-shell is-front-image'>
              {product.thumbnail ? (
                <Image
                  src={product.thumbnail}
                  alt={product.name}
                  fill
                  sizes='(min-width: 1500px) 12vw, (min-width: 1180px) 14vw, (min-width: 900px) 16vw, (min-width: 640px) 28vw, 48vw'
                  className='category-card-image object-cover'
                />
              ) : (
                <div className='category-card-image-fallback'>
                  <span>{product.category.slice(0, 2)}</span>
                </div>
              )}
            </div>

            <h3 className='category-card-front-title'>{product.name}</h3>
          </article>

          <article className='category-flip-face category-flip-back'>
            <div className='category-card-back-header'>
              <span className='category-card-category'>{product.category}</span>
              <span className={`category-delivery-badge ${deliveryBadge.tone}`}>
                <deliveryBadge.Icon className='h-3 w-3' />
                {deliveryBadge.label}
              </span>
            </div>

            <div className='category-card-back-content'>
              <h3 className='category-card-title is-back'>{product.name}</h3>
              <p className='category-card-description'>
                {product.description?.trim() || 'منتج رقمي جاهز للطلب ضمن واجهة Bily Card.'}
              </p>
              <div className='category-card-back-meta'>
                <span className={`category-availability-chip ${product.available ? 'is-available' : 'is-unavailable'}`}>
                  {product.available ? 'متوفر الآن' : 'غير متوفر'}
                </span>
                <span className='category-card-price'>${product.finalPriceFrom.toFixed(2)}</span>
              </div>
            </div>

            <div className='category-card-actions'>
              <button
                type='button'
                className={`category-card-heart inline-flex justify-center ${isFavorite ? 'is-active' : ''}`}
                onClick={(event) => {
                  event.stopPropagation()
                  toggleFavorite()
                }}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              >
                <Heart className='h-3.5 w-3.5' />
              </button>
              <button
                type='button'
                className='category-card-cta'
                onClick={(event) => {
                  event.stopPropagation()
                  openPurchasePopup()
                }}
              >
                شراء الآن
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
