'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<'credentials' | 'verify'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submitCredentials(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const json = await res.json().catch(() => null)
    setLoading(false)

    if (!res.ok) {
      setError(json?.error?.message ?? 'بيانات الدخول غير صحيحة')
      return
    }

    setChallengeId(json?.data?.challengeId ?? '')
    setStep('verify')
    setMessage('تم إرسال كود التحقق إلى بريدك الإلكتروني')
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, code }),
    })

    const json = await res.json().catch(() => null)
    setLoading(false)

    if (!res.ok) {
      setError(json?.error?.message ?? 'رمز التحقق غير صحيح')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={step === 'credentials' ? submitCredentials : submitCode} className='card-shell space-y-3 p-5'>
      <h1 className='text-xl font-bold'>تسجيل الدخول</h1>

      {step === 'credentials' ? (
        <>
          <Input type='email' placeholder='Email' value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input
            type='password'
            placeholder='Password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </>
      ) : (
        <>
          <p className='text-sm leading-7 text-slate-300'>أدخل كود التحقق الذي أرسلناه إلى البريد: {email}</p>
          <Input
            inputMode='numeric'
            maxLength={6}
            placeholder='كود التحقق'
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </>
      )}

      {message ? <p className='text-sm text-emerald-300'>{message}</p> : null}
      {error ? <p className='text-sm text-rose-300'>{error}</p> : null}

      <Button className='w-full' type='submit' disabled={loading}>
        {loading ? '...' : step === 'credentials' ? 'إرسال كود التحقق' : 'تأكيد الدخول'}
      </Button>

      {step === 'verify' ? (
        <button
          type='button'
          onClick={() => {
            setStep('credentials')
            setCode('')
            setChallengeId('')
            setMessage('')
            setError('')
          }}
          className='w-full text-sm text-slate-300 transition hover:text-white'
        >
          رجوع
        </button>
      ) : null}

      <div className='flex items-center justify-between gap-3 text-sm'>
        <Link href='/forgot-password' className='text-cyan-300 transition hover:text-cyan-200'>
          نسيت كلمة المرور؟
        </Link>
        <Link href='/register' className='text-slate-300 transition hover:text-white'>
          Register
        </Link>
      </div>
    </form>
  )
}
