'use client'

import { useEffect, useState } from 'react'
import { MonitorCog, MoonStar, SunMedium } from 'lucide-react'
import { useLocale } from '@/components/i18n/locale-provider'

type ThemeMode = 'dark' | 'light'

function applyTheme(nextTheme: ThemeMode) {
  document.documentElement.setAttribute('data-theme', nextTheme)
  document.documentElement.style.colorScheme = nextTheme
  window.localStorage.setItem('bily-theme', nextTheme)
}

export function ThemeToggle({
  compact = false,
  className = '',
}: {
  compact?: boolean
  className?: string
}) {
  const { t } = useLocale()
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    if (current === 'light' || current === 'dark') {
      setTheme(current)
    }
    setMounted(true)
  }, [])

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    applyTheme(nextTheme)
  }

  const isLight = mounted && theme === 'light'
  const Icon = !mounted ? MonitorCog : isLight ? MoonStar : SunMedium
  const label = !mounted ? t('appearance_label') : isLight ? t('theme_dark') : t('theme_light')
  const actionLabel = `${t('theme_toggle')}: ${label}`

  if (compact) {
    return (
      <button
        type='button'
        onClick={toggleTheme}
        className={`theme-icon-button inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm ${className}`}
        title={actionLabel}
        aria-label={actionLabel}
      >
        <Icon className='h-4 w-4' />
      </button>
    )
  }

  return (
    <button
      type='button'
      onClick={toggleTheme}
      className={`theme-toggle-button inline-flex items-center justify-center gap-1 rounded-2xl px-2 text-[11px] ${className}`}
      title={actionLabel}
      aria-label={actionLabel}
    >
      <Icon className='h-3.5 w-3.5' />
      {label}
    </button>
  )
}
