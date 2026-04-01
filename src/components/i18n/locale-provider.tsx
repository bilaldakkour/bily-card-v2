'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_LOCALE,
  type AppDirection,
  type AppLocale,
  getLocaleDirection,
  SHARED_UI_MESSAGES,
} from '@/i18n/shared-ui'

const STORAGE_KEY = 'bily-locale'

type LocaleContextValue = {
  locale: AppLocale
  direction: AppDirection
  setLocale: (locale: AppLocale) => void
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function applyLocale(locale: AppLocale) {
  const direction = getLocaleDirection(locale)
  document.documentElement.lang = locale
  document.documentElement.dir = direction
  document.documentElement.setAttribute('data-locale', locale)
  window.localStorage.setItem(STORAGE_KEY, locale)
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE)

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-locale')
    if (current === 'ar' || current === 'en' || current === 'fr') {
      setLocaleState(current)
      return
    }

    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'ar' || saved === 'en' || saved === 'fr') {
      setLocaleState(saved)
      applyLocale(saved)
      return
    }

    applyLocale(DEFAULT_LOCALE)
  }, [])

  const value = useMemo<LocaleContextValue>(() => {
    const direction = getLocaleDirection(locale)

    return {
      locale,
      direction,
      setLocale(nextLocale) {
        setLocaleState(nextLocale)
        applyLocale(nextLocale)
      },
      t(key) {
        return SHARED_UI_MESSAGES[locale][key] ?? SHARED_UI_MESSAGES[DEFAULT_LOCALE][key] ?? key
      },
    }
  }, [locale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider')
  }

  return context
}
