'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    setLoading(false)

    if (!res.ok) {
      setError('تعذر إرسال رابط الاسترجاع. تأكد من البريد وحاول مجددًا.')
      return
    }

    setMessage('إذا كان البريد موجودًا، أرسلنا لك رابط إعادة تعيين كلمة المرور.')
  }

  return (
    <form onSubmit={submit} className='card-shell w-full space-y-4 p-5 text-right'>
      <h1 className='text-xl font-bold'>نسيت كلمة المرور؟</h1>
      <p className='text-sm leading-7 text-slate-300'>أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.</p>
      <Input
        type='email'
        placeholder='Email'
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      {message ? <p className='text-sm text-emerald-300'>{message}</p> : null}
      {error ? <p className='text-sm text-rose-300'>{error}</p> : null}
      <Button className='w-full' type='submit' disabled={loading}>
        {loading ? '...' : 'إرسال رابط الاسترجاع'}
      </Button>
      <div className='flex items-center justify-between gap-3 text-sm'>
        <Link href='/login' className='text-cyan-300 transition hover:text-cyan-200'>
          العودة إلى تسجيل الدخول
        </Link>
        <Link href='/register' className='text-slate-300 transition hover:text-white'>
          Register
        </Link>
      </div>
    </form>
  )
}
