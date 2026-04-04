'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function RegisterForm() {
  const router = useRouter()
  const [step, setStep] = useState<'details' | 'verify'>('details')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submitDetails(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    const json = await res.json().catch(() => null)
    setLoading(false)

    if (!res.ok) {
      setError(json?.error?.message ?? 'تعذر إنشاء الحساب')
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
    <form onSubmit={step === 'details' ? submitDetails : submitCode} className='card-shell space-y-3 p-5'>
      <h1 className='text-xl font-bold'>إنشاء حساب</h1>

      {step === 'details' ? (
        <>
          <Input placeholder='Name' value={name} onChange={(event) => setName(event.target.value)} required />
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
        {loading ? '...' : step === 'details' ? 'إرسال كود التحقق' : 'تأكيد التسجيل'}
      </Button>

      {step === 'verify' ? (
        <button
          type='button'
          onClick={() => {
            setStep('details')
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
    </form>
  )
}
