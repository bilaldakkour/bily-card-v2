'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!token) {
      setError('رابط إعادة التعيين غير صالح')
      return
    }

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }

    if (password !== confirmPassword) {
      setError('تأكيد كلمة المرور غير مطابق')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })

    const json = await res.json().catch(() => null)
    setLoading(false)

    if (!res.ok) {
      setError(json?.error?.message ?? 'تعذر إعادة تعيين كلمة المرور')
      return
    }

    setMessage('تم تغيير كلمة المرور بنجاح. سيتم تحويلك إلى صفحة الدخول.')
    setTimeout(() => {
      router.push('/login')
      router.refresh()
    }, 1200)
  }

  return (
    <form onSubmit={submit} className='card-shell w-full space-y-4 p-5 text-right'>
      <h1 className='text-xl font-bold'>إعادة تعيين كلمة المرور</h1>
      <p className='text-sm leading-7 text-slate-300'>أدخل كلمة المرور الجديدة ثم أكدها لحفظ التغيير.</p>
      <Input
        type='password'
        placeholder='كلمة المرور الجديدة'
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <Input
        type='password'
        placeholder='تأكيد كلمة المرور'
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        required
      />
      {message ? <p className='text-sm text-emerald-300'>{message}</p> : null}
      {error ? <p className='text-sm text-rose-300'>{error}</p> : null}
      <Button className='w-full' type='submit' disabled={loading}>
        {loading ? '...' : 'حفظ كلمة المرور الجديدة'}
      </Button>
      <div className='text-sm'>
        <Link href='/login' className='text-cyan-300 transition hover:text-cyan-200'>
          العودة إلى تسجيل الدخول
        </Link>
      </div>
    </form>
  )
}
