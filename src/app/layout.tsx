import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import Script from 'next/script'
import { LocaleProvider } from '@/components/i18n/locale-provider'
import './globals.css'

const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo' })

export const metadata: Metadata = {
  title: 'Bily Card',
  description: 'Bily Card - Digital Gaming Top-up',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='ar' dir='rtl' suppressHydrationWarning>
      <body suppressHydrationWarning className={`${cairo.variable} min-h-screen bg-bg text-slate-100 antialiased`}>
        <Script
          id='bily-theme-init'
          strategy='beforeInteractive'
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var key='bily-theme';var saved=localStorage.getItem(key);var theme=(saved==='light'||saved==='dark')?saved:'dark';var root=document.documentElement;root.classList.toggle('dark',theme==='dark');root.style.colorScheme=theme;}catch(e){var root=document.documentElement;root.classList.add('dark');root.style.colorScheme='dark';}})();`,
          }}
        />
        <Script
          id='bily-locale-init'
          strategy='beforeInteractive'
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var key='bily-locale';var saved=localStorage.getItem(key);var locale=(saved==='ar'||saved==='en'||saved==='fr')?saved:'ar';var dir=locale==='ar'?'rtl':'ltr';document.documentElement.setAttribute('lang',locale);document.documentElement.setAttribute('dir',dir);document.documentElement.setAttribute('data-locale',locale);}catch(e){document.documentElement.setAttribute('lang','ar');document.documentElement.setAttribute('dir','rtl');document.documentElement.setAttribute('data-locale','ar');}})();`,
          }}
        />
        <div className='pointer-events-none fixed inset-0 bg-grid bg-[size:18px_18px] opacity-20' />
        <LocaleProvider>
          <div className='relative'>{children}</div>
        </LocaleProvider>
      </body>
    </html>
  )
}
