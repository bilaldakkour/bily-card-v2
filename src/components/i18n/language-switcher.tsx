'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Globe2 } from 'lucide-react'
import { APP_LOCALES, type AppLocale } from '@/i18n/shared-ui'
import { useLocale } from '@/components/i18n/locale-provider'

export function LanguageSwitcher({
  compact = false,
  className = '',
}: {
  compact?: boolean
  className?: string
}) {
  const { locale, setLocale, t, direction } = useLocale()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const currentLabel = locale === 'ar' ? t('language_ar') : locale === 'fr' ? t('language_fr') : t('language_en')
  const buttonLabel = compact ? t('language_short') : t('language_label')

  return (
    <div ref={rootRef} className={`relative ${className}`} dir={direction}>
      <button
        type='button'
        onClick={() => setOpen((value) => !value)}
        className={`theme-toggle-button inline-flex items-center justify-center gap-2 rounded-2xl ${
          compact ? 'h-10 min-w-10 px-3 text-xs' : 'h-10 px-3 text-sm'
        }`}
        aria-label={t('language_label')}
        title={`${t('language_label')}: ${currentLabel}`}
      >
        <Globe2 className='h-4 w-4' />
        <span>{buttonLabel}</span>
      </button>

      {open ? (
        <div
          className='panel-soft-surface absolute z-[120] mt-2 min-w-[176px] overflow-hidden rounded-2xl p-1.5 shadow-2xl'
          style={{ insetInlineStart: 0 }}
        >
          {APP_LOCALES.map((item) => {
            const label = item === 'ar' ? t('language_ar') : item === 'fr' ? t('language_fr') : t('language_en')
            const active = item === locale

            return (
              <button
                key={item}
                type='button'
                onClick={() => {
                  setLocale(item as AppLocale)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-[rgba(var(--theme-accent),0.14)] text-[rgb(var(--text-primary))]'
                    : 'text-[rgb(var(--text-primary))] hover:bg-[rgba(var(--theme-hover),0.08)]'
                }`}
              >
                <span>{label}</span>
                {active ? <Check className='h-4 w-4 text-[rgb(var(--theme-accent))]' /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
