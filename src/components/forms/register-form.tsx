'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    setLoading(false)

    if (!res.ok) {
      setError('تعذر إنشاء الحساب')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className='card-shell space-y-3 p-5'>
      <h1 className='text-xl font-bold'>إنشاء حساب</h1>
      <Input placeholder='Name' value={name} onChange={(event) => setName(event.target.value)} required />
      <Input type='email' placeholder='Email' value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Input
        type='password'
        placeholder='Password'
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      {error ? <p className='text-sm text-rose-300'>{error}</p> : null}
      <Button className='w-full' type='submit' disabled={loading}>
        {loading ? '...' : 'تسجيل'}
      </Button>
    </form>
  )
}

