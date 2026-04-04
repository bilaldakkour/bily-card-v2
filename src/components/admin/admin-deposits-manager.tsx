'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fromMinor } from '@/core/money'
import { AdminPageShell } from '@/components/admin/admin-page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type DepositRow = {
  _id: string
  userId: string
  amountMinor: number
  status: 'pending' | 'approved' | 'rejected'
  adminNote?: string
  createdAt: string
}

export function AdminDepositsManager({ initial }: { initial: DepositRow[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [status, setStatus] = useState('pending')
  const [message, setMessage] = useState('')
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({})

  async function refresh(currentStatus = status) {
    const res = await fetch(`/api/admin/deposits?status=${currentStatus}`, { cache: 'no-store' })
    const json = await res.json()
    setItems(json.data)
  }

  async function approve(id: string) {
    const res = await fetch(`/api/admin/deposits/${id}/approve`, { method: 'POST' })
    if (!res.ok) {
      setMessage('فشل الموافقة على الإيداع')
      return
    }
    setMessage('تمت الموافقة على الإيداع')
    await refresh()
    router.refresh()
  }

  async function reject(id: string) {
    const note = rejectNotes[id] ?? ''
    const res = await fetch(`/api/admin/deposits/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })

    if (!res.ok) {
      setMessage('فشل رفض الإيداع')
      return
    }

    setMessage('تم رفض الإيداع')
    await refresh()
    router.refresh()
  }

  return (
    <AdminPageShell
      title='طلبات الإيداع'
      description='مراجعة الإيداعات المعلقة والمقبولة والمرفوضة مع تنفيذ القرار مباشرة من نفس الصفحة.'
      actions={
        <select
          className='input-shell w-44'
          value={status}
          onChange={async (e) => {
            setStatus(e.target.value)
            await refresh(e.target.value)
          }}
        >
          <option value='pending'>pending</option>
          <option value='approved'>approved</option>
          <option value='rejected'>rejected</option>
        </select>
      }
    >
      {message ? <span className='text-xs text-cyan-300'>{message}</span> : null}

      <div className='space-y-2'>
        {items.length === 0 ? <div className='card-shell p-6 text-center text-sm text-slate-400'>لا توجد طلبات ضمن هذا الفلتر.</div> : null}
        {items.map((item) => (
          <div key={item._id} className='card-shell space-y-2 p-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <div className='text-lg font-black text-cyan-300'>${fromMinor(item.amountMinor).toFixed(2)}</div>
                <div className='text-xs text-slate-400'>user: {item.userId}</div>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  item.status === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : item.status === 'rejected'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {item.status}
              </span>
            </div>

            {item.status === 'pending' ? (
              <>
                <Input
                  placeholder='سبب الرفض (اختياري)'
                  value={rejectNotes[item._id] ?? ''}
                  onChange={(e) => setRejectNotes((prev) => ({ ...prev, [item._id]: e.target.value }))}
                />
                <div className='flex gap-2'>
                  <Button onClick={() => approve(item._id)}>Approve</Button>
                  <Button variant='secondary' onClick={() => reject(item._id)}>
                    Reject
                  </Button>
                </div>
              </>
            ) : item.adminNote ? (
              <p className='text-xs text-slate-300'>note: {item.adminNote}</p>
            ) : null}
          </div>
        ))}
      </div>
    </AdminPageShell>
  )
}

