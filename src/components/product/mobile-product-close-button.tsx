'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export function MobileProductCloseButton() {
  const router = useRouter()

  return (
    <button
      type='button'
      onClick={() => {
        if (window.history.length > 1) {
          router.back()
          return
        }

        router.push('/')
      }}
      className='inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:bg-black/35'
      aria-label='إغلاق صفحة المنتج'
    >
      <X className='h-4 w-4' />
    </button>
  )
}
