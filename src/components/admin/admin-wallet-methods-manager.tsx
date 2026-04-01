'use client'

import { useState } from 'react'
import { AdminPageShell } from '@/components/admin/admin-page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type WalletMethod = {
  _id: string
  key: string
  name: string
  type: 'crypto' | 'mobile' | 'bank' | 'cash'
  network: string
  currency: string
  address: string
  accountNumber: string
  phone: string
  holderName: string
  iconUrl: string
  instructions: string
  processingTimeText: string
  requiresReceipt: boolean
  minAmount: number | null
  maxAmount: number | null
  feePercent: number
  feeFixed: number
  active: boolean
  visible: boolean
  sortOrder: number
}

const emptyMethod: Omit<WalletMethod, '_id'> = {
  key: '',
  name: '',
  type: 'crypto',
  network: '',
  currency: 'USDT',
  address: '',
  accountNumber: '',
  phone: '',
  holderName: '',
  iconUrl: '',
  instructions: '',
  processingTimeText: '',
  requiresReceipt: true,
  minAmount: null,
  maxAmount: null,
  feePercent: 0,
  feeFixed: 0,
  active: true,
  visible: true,
  sortOrder: 0,
}

export function AdminWalletMethodsManager({ initial }: { initial: WalletMethod[] }) {
  const [items, setItems] = useState(initial)
  const [selectedId, setSelectedId] = useState(initial[0]?._id ?? '')
  const [draft, setDraft] = useState<Omit<WalletMethod, '_id'>>(emptyMethod)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function patchDraft(key: keyof Omit<WalletMethod, '_id'>, value: unknown) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function loadMethod(item: WalletMethod) {
    setSelectedId(item._id)
    setDraft({ ...item })
  }

  function resetDraft() {
    setSelectedId('')
    setDraft(emptyMethod)
  }

  async function refresh(preferId?: string) {
    const res = await fetch('/api/admin/wallet-methods', { cache: 'no-store' })
    const json = await res.json()
    const next = json.data ?? []
    setItems(next)
    const target = preferId && next.find((item: WalletMethod) => item._id === preferId)
    if (target) {
      setSelectedId(target._id)
      setDraft({ ...target })
      return
    }
    if (!preferId && selectedId) {
      const current = next.find((item: WalletMethod) => item._id === selectedId)
      if (current) {
        setDraft({ ...current })
        return
      }
    }
    resetDraft()
  }

  async function save() {
    setLoading(true)
    setMessage('')

    const payload = {
      ...draft,
      minAmount: draft.minAmount == null ? null : Number(draft.minAmount),
      maxAmount: draft.maxAmount == null ? null : Number(draft.maxAmount),
      feePercent: Number(draft.feePercent || 0),
      feeFixed: Number(draft.feeFixed || 0),
      sortOrder: Number(draft.sortOrder || 0),
    }

    const res = await fetch(selectedId ? `/api/admin/wallet-methods/${selectedId}` : '/api/admin/wallet-methods', {
      method: selectedId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setLoading(false)

    if (!res.ok) {
      setMessage('فشل حفظ وسيلة الإيداع')
      return
    }

    const json = await res.json()
    setMessage(selectedId ? 'تم تحديث وسيلة الإيداع' : 'تمت إضافة وسيلة الإيداع')
    await refresh(json?.data?._id)
  }

  async function remove() {
    if (!selectedId) return

    setLoading(true)
    setMessage('')
    const res = await fetch(`/api/admin/wallet-methods/${selectedId}`, { method: 'DELETE' })
    setLoading(false)

    if (!res.ok) {
      setMessage('فشل حذف وسيلة الإيداع')
      return
    }

    setMessage('تم حذف وسيلة الإيداع')
    await refresh()
  }

  return (
    <AdminPageShell
      title='وسائل الإيداع'
      description='إدارة وسائل الإيداع والتحويل التي تظهر للمستخدمين في صفحة المحفظة مع الحفاظ على نفس تدفق طلب الإيداع الحالي.'
      actions={
        <>
          <Button variant='secondary' onClick={resetDraft}>
            إضافة جديدة
          </Button>
          {selectedId ? (
            <Button variant='secondary' onClick={remove} disabled={loading}>
              حذف
            </Button>
          ) : null}
        </>
      }
    >
      {message ? <div className='text-sm text-cyan-300'>{message}</div> : null}

      <div className='grid gap-4 xl:grid-cols-[320px_1fr]'>
        <div className='card-shell space-y-2 p-4'>
          <div className='text-sm font-bold text-white'>قائمة الوسائل</div>
          <div className='space-y-2'>
            {items.length === 0 ? <div className='text-sm text-slate-400'>لا توجد وسائل مضافة بعد.</div> : null}
            {items.map((item) => (
              <button
                key={item._id}
                type='button'
                onClick={() => loadMethod(item)}
                className={`w-full rounded-2xl border p-3 text-right transition ${
                  selectedId === item._id
                    ? 'border-cyan-300/45 bg-cyan-400/[0.08]'
                    : 'border-cyan-400/12 bg-white/[0.02] hover:border-cyan-300/22'
                }`}
              >
                <div className='flex items-center justify-between gap-2'>
                  <div>
                    <div className='font-semibold text-white'>{item.name}</div>
                    <div className='text-xs text-slate-400'>
                      {item.key} · {item.currency} · {item.type}
                    </div>
                  </div>
                  <div className='flex gap-1 text-[11px]'>
                    <span className={`rounded-full px-2 py-1 ${item.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                      {item.active ? 'active' : 'off'}
                    </span>
                    <span className={`rounded-full px-2 py-1 ${item.visible ? 'bg-cyan-500/15 text-cyan-300' : 'bg-slate-500/15 text-slate-300'}`}>
                      {item.visible ? 'visible' : 'hidden'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className='card-shell space-y-4 p-4'>
          <div className='grid gap-3 md:grid-cols-2'>
            <Input value={draft.name} onChange={(e) => patchDraft('name', e.target.value)} placeholder='name' />
            <Input value={draft.key} onChange={(e) => patchDraft('key', e.target.value)} placeholder='key' />
            <select className='input-shell' value={draft.type} onChange={(e) => patchDraft('type', e.target.value as WalletMethod['type'])}>
              <option value='crypto'>crypto</option>
              <option value='mobile'>mobile</option>
              <option value='bank'>bank</option>
              <option value='cash'>cash</option>
            </select>
            <Input value={draft.currency} onChange={(e) => patchDraft('currency', e.target.value)} placeholder='currency' />
            <Input value={draft.network} onChange={(e) => patchDraft('network', e.target.value)} placeholder='network' />
            <Input value={draft.iconUrl} onChange={(e) => patchDraft('iconUrl', e.target.value)} placeholder='iconUrl' />
            <Input value={draft.address} onChange={(e) => patchDraft('address', e.target.value)} placeholder='address' />
            <Input value={draft.phone} onChange={(e) => patchDraft('phone', e.target.value)} placeholder='phone' />
            <Input value={draft.accountNumber} onChange={(e) => patchDraft('accountNumber', e.target.value)} placeholder='accountNumber' />
            <Input value={draft.holderName} onChange={(e) => patchDraft('holderName', e.target.value)} placeholder='holderName' />
            <Input value={draft.processingTimeText} onChange={(e) => patchDraft('processingTimeText', e.target.value)} placeholder='processingTimeText' />
            <Input type='number' value={String(draft.sortOrder)} onChange={(e) => patchDraft('sortOrder', Number(e.target.value || 0))} placeholder='sortOrder' />
            <Input type='number' value={draft.minAmount ?? ''} onChange={(e) => patchDraft('minAmount', e.target.value === '' ? null : Number(e.target.value))} placeholder='minAmount' />
            <Input type='number' value={draft.maxAmount ?? ''} onChange={(e) => patchDraft('maxAmount', e.target.value === '' ? null : Number(e.target.value))} placeholder='maxAmount' />
            <Input type='number' step='0.01' value={String(draft.feePercent)} onChange={(e) => patchDraft('feePercent', Number(e.target.value || 0))} placeholder='feePercent' />
            <Input type='number' step='0.01' value={String(draft.feeFixed)} onChange={(e) => patchDraft('feeFixed', Number(e.target.value || 0))} placeholder='feeFixed' />
          </div>

          <textarea
            className='input-shell min-h-24 w-full resize-y py-3'
            value={draft.instructions}
            onChange={(e) => patchDraft('instructions', e.target.value)}
            placeholder='instructions'
          />

          <div className='flex flex-wrap gap-4 text-sm text-slate-200'>
            <label className='inline-flex items-center gap-2'>
              <input type='checkbox' checked={draft.requiresReceipt} onChange={(e) => patchDraft('requiresReceipt', e.target.checked)} />
              requiresReceipt
            </label>
            <label className='inline-flex items-center gap-2'>
              <input type='checkbox' checked={draft.active} onChange={(e) => patchDraft('active', e.target.checked)} />
              active
            </label>
            <label className='inline-flex items-center gap-2'>
              <input type='checkbox' checked={draft.visible} onChange={(e) => patchDraft('visible', e.target.checked)} />
              visible
            </label>
          </div>

          <div className='flex gap-2'>
            <Button onClick={save} disabled={loading}>
              {loading ? '...' : selectedId ? 'تحديث' : 'إضافة'}
            </Button>
            <Button variant='secondary' onClick={resetDraft}>
              إلغاء
            </Button>
          </div>
        </div>
      </div>
    </AdminPageShell>
  )
}
