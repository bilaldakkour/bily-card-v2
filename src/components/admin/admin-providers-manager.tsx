'use client'

import { useState } from 'react'
import { AdminPageShell } from '@/components/admin/admin-page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ProviderSetting = {
  _id?: string
  provider: 'daily_card' | 'go4_card'
  baseUrl: string
  enabled: boolean
  timeoutMs: number
}

export function AdminProvidersManager({ initial }: { initial: ProviderSetting[] }) {
  const [items, setItems] = useState<ProviderSetting[]>(
    initial.length
      ? initial
      : [
          { provider: 'daily_card', baseUrl: '', enabled: false, timeoutMs: 6000 },
          { provider: 'go4_card', baseUrl: '', enabled: false, timeoutMs: 6000 },
        ]
  )
  const [status, setStatus] = useState('')
  const [savingProvider, setSavingProvider] = useState('')
  const [syncingProvider, setSyncingProvider] = useState('')

  async function save(item: ProviderSetting) {
    setSavingProvider(item.provider)
    const res = await fetch('/api/admin/providers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).finally(() => setSavingProvider(''))

    if (!res.ok) {
      setStatus(`فشل حفظ إعدادات ${item.provider}`)
      return
    }

    setStatus(`تم حفظ إعدادات ${item.provider}`)
  }

  async function syncCatalog(provider: ProviderSetting['provider']) {
    setSyncingProvider(provider)
    const res = await fetch('/api/admin/providers/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    }).finally(() => setSyncingProvider(''))

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setStatus(json?.error?.message ?? `فشل مزامنة كاتالوج ${provider}`)
      return
    }

    setStatus(`تمت مزامنة ${provider} بعدد ${json?.data?.productsCount ?? 0} منتج`)
  }

  function patch(index: number, key: keyof ProviderSetting, value: unknown) {
    const next = [...items]
    next[index] = { ...next[index], [key]: value }
    setItems(next)
  }

  return (
    <AdminPageShell
      title='إعدادات المزودين'
      description='إعدادات التشغيل الداخلية للمزوّدين. هذه الصفحة Admin-only ولا يظهر أي اسم مزوّد للعميل.'
    >
      {status ? <p className='text-xs text-cyan-300'>{status}</p> : null}
      <div className='grid gap-3 lg:grid-cols-2'>
        {items.map((item, index) => (
          <div key={item.provider} className='card-shell space-y-3 p-4'>
            <div className='flex items-center justify-between gap-2'>
              <h2 className='text-base font-bold'>{item.provider}</h2>
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  item.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'
                }`}
              >
                {item.enabled ? 'enabled' : 'disabled'}
              </span>
            </div>

            <div className='grid gap-2'>
              <label className='space-y-1 text-xs text-slate-400'>
                <span>Base URL</span>
                <Input value={item.baseUrl} onChange={(e) => patch(index, 'baseUrl', e.target.value)} placeholder='https://api.example.com' />
              </label>
              <label className='space-y-1 text-xs text-slate-400'>
                <span>Timeout (ms)</span>
                <Input
                  type='number'
                  min={1000}
                  step={500}
                  value={item.timeoutMs}
                  onChange={(e) => patch(index, 'timeoutMs', Number(e.target.value))}
                  placeholder='6000'
                />
              </label>
            </div>

            <label className='inline-flex items-center gap-2 text-sm'>
              <input type='checkbox' checked={item.enabled} onChange={(e) => patch(index, 'enabled', e.target.checked)} />
              تفعيل هذا المزوّد
            </label>

            <div className='flex flex-wrap gap-2'>
              <Button onClick={() => save(item)} disabled={savingProvider === item.provider}>
                {savingProvider === item.provider ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button variant='secondary' onClick={() => syncCatalog(item.provider)} disabled={syncingProvider === item.provider}>
                {syncingProvider === item.provider ? 'Syncing...' : 'Sync Catalog'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AdminPageShell>
  )
}

