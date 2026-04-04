'use client'

import Link from 'next/link'
import { useLocale } from '@/components/i18n/locale-provider'
import { BilySupportActions } from '@/components/layout/BilySupportActions'

export default function BilyFooter() {
  const { t, direction } = useLocale()
  const textAlign = direction === 'rtl' ? 'text-right' : 'text-left'

  return (
    <footer className='footer-premium-shell mt-6 border-t backdrop-blur' dir={direction}>
      <div className='mx-auto max-w-[1600px] px-4 py-5 sm:px-6'>
        <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${textAlign}`}>
          <div className='space-y-1'>
            <div className='text-base font-bold text-violet-200'>Bily Card</div>
            <p className='text-xs text-slate-300'>{t('footer_tagline')}</p>
          </div>

          <div className='flex items-center gap-4 text-sm text-slate-300'>
            <Link href='/support' className='transition hover:text-violet-200'>
              {t('footer_contact')}
            </Link>
            <Link href='/profile' className='transition hover:text-violet-200'>
              {t('footer_about')}
            </Link>
          </div>
        </div>

        <div className='footer-support-shell mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-3 py-3'>
          <div className={`text-sm text-slate-300 ${textAlign}`}>{t('support_contact')}</div>
          <BilySupportActions compact />
        </div>

        <div className='mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-violet-400/15 pt-3 text-xs text-slate-400'>
          <span>{t('footer_design')}</span>
          <span>{t('footer_rights')}</span>
        </div>
      </div>
    </footer>
  )
}
