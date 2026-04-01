'use client'

import Link from 'next/link'
import { Headset, MessageCircleMore } from 'lucide-react'
import { useLocale } from '@/components/i18n/locale-provider'
import { SUPPORT_LINKS } from '@/config/public-links'

function TikTokIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' className={className} fill='currentColor' aria-hidden='true'>
      <path d='M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.12v12.11a2.9 2.9 0 1 1-2-2.75V8.19a6 6 0 1 0 5.99 5.92V7.96a7.9 7.9 0 0 0 4.9 1.71V6.69Z' />
    </svg>
  )
}

export function BilySupportActions({
  compact = false,
  className = '',
}: {
  compact?: boolean
  className?: string
}) {
  const { t, direction } = useLocale()

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`} dir={direction}>
        <Link href={SUPPORT_LINKS.supportPage} className='theme-toggle-button inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-xs font-semibold'>
          <Headset className='h-3.5 w-3.5' />
          {t('support_contact')}
        </Link>
        <a
          href={SUPPORT_LINKS.whatsappUrl}
          target='_blank'
          rel='noreferrer'
          aria-label={t('whatsapp')}
          className='theme-icon-button inline-flex h-10 w-10 items-center justify-center rounded-2xl'
        >
          <MessageCircleMore className='h-4 w-4' />
        </a>
        <a
          href={SUPPORT_LINKS.tiktokUrl}
          target='_blank'
          rel='noreferrer'
          aria-label={t('tiktok')}
          className='theme-icon-button inline-flex h-10 w-10 items-center justify-center rounded-2xl'
        >
          <TikTokIcon className='h-4 w-4' />
        </a>
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} dir={direction}>
      <Link href={SUPPORT_LINKS.supportPage} className='theme-toggle-button inline-flex min-h-10 items-center gap-2 rounded-2xl px-3 text-sm font-semibold'>
        <Headset className='h-4 w-4' />
        {t('support_contact')}
      </Link>
      <a
        href={SUPPORT_LINKS.whatsappUrl}
        target='_blank'
        rel='noreferrer'
        className='support-social-link inline-flex min-h-10 items-center gap-2 rounded-2xl px-3 text-sm'
      >
        <MessageCircleMore className='h-4 w-4' />
        {t('whatsapp')}
      </a>
      <a
        href={SUPPORT_LINKS.tiktokUrl}
        target='_blank'
        rel='noreferrer'
        className='support-social-link inline-flex min-h-10 items-center gap-2 rounded-2xl px-3 text-sm'
      >
        <TikTokIcon className='h-4 w-4' />
        {t('tiktok')}
      </a>
    </div>
  )
}
