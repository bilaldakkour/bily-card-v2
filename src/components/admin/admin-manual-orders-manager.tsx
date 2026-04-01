'use client'

import { useMemo, useState } from 'react'
import { fromMinor, roundVisible } from '@/core/money'
import { AdminPageShell } from '@/components/admin/admin-page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ManualOrderRow = {
  _id: string
  orderId: string
  source: 'customer_queue' | 'admin_local'
  manualStatus: 'pending' | 'processing' | 'done' | 'cancelled'
  orderStatus: string
  note: string
  productName: string
  productSlug: string
  packageKey?: string | null
  countValue?: number | null
  playerAccount: string
  totalCostMinor: number
  totalPriceMinor: number
  profitMinor: number
  profitPercent: number
  fulfillMode: string
  userName: string
  userEmail: string
  createdAt: string
  updatedAt: string
}

type AdminUserOption = {
  _id: string
  name: string
  email: string
}

type ProductOption = {
  _id: string
  name: string
  slug: string
  kind: 'package' | 'count' | 'manual'
  packages?: Array<{
    key: string
    label: string
    active?: boolean
    visible?: boolean
  }>
}

type CreateStatus = 'pending' | 'processing' | 'completed' | 'cancelled'

const initialForm = {
  userId: '',
  productId: '',
  packageKey: '',
  countValue: '1',
  playerAccount: '',
  purchaseAmount: '',
  saleAmount: '',
  status: 'pending' as CreateStatus,
  note: '',
}

export function AdminManualOrdersManager({
  initial,
  users,
  products,
}: {
  initial: ManualOrderRow[]
  users: AdminUserOption[]
  products: ProductOption[]
}) {
  const [items, setItems] = useState(initial)
  const [message, setMessage] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [form, setForm] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedProduct = useMemo(
    () => products.find((product) => product._id === form.productId) ?? null,
    [form.productId, products]
  )

  const availablePackages = useMemo(
    () => (selectedProduct?.packages ?? []).filter((item) => item.active !== false && item.visible !== false),
    [selectedProduct]
  )

  const purchaseAmount = Number(form.purchaseAmount || 0)
  const saleAmount = Number(form.saleAmount || 0)
  const profitAmount = saleAmount - purchaseAmount
  const profitPercent = purchaseAmount > 0 ? (profitAmount / purchaseAmount) * 100 : 0

  async function refresh() {
    const res = await fetch('/api/admin/manual-orders', { cache: 'no-store' })
    const json = await res.json()
    setItems(json.data)
  }

  async function createManualOrder() {
    setIsSubmitting(true)
    setMessage('')

    const payload = {
      userId: form.userId,
      productId: form.productId,
      packageKey: selectedProduct?.kind === 'package' ? form.packageKey : undefined,
      countValue: selectedProduct?.kind === 'count' ? Number(form.countValue || 0) : undefined,
      playerAccount: form.playerAccount,
      purchaseAmount: Number(form.purchaseAmount || 0),
      saleAmount: Number(form.saleAmount || 0),
      status: form.status,
      note: form.note.trim() || undefined,
    }

    const res = await fetch('/api/admin/manual-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      setMessage('فشل إنشاء الطلب اليدوي')
      setIsSubmitting(false)
      return
    }

    setForm(initialForm)
    setMessage('تم إنشاء الطلب اليدوي بنجاح')
    setIsSubmitting(false)
    await refresh()
  }

  async function updateStatus(id: string, status: ManualOrderRow['manualStatus']) {
    const note = notes[id] ?? ''
    const res = await fetch(`/api/admin/manual-orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    })

    if (!res.ok) {
      setMessage('فشل تحديث الطلب اليدوي')
      return
    }

    setMessage('تم تحديث الطلب اليدوي')
    await refresh()
  }

  return (
    <AdminPageShell
      title='الطلبات اليدوية'
      description='إنشاء طلبات محلية من الأدمن مع حفظ التكلفة والبيع والربح بوضوح، مع إبقاء صف تنفيذ الطلبات اليدوية الحالي كما هو.'
    >
      {message ? <p className='text-xs text-cyan-300'>{message}</p> : null}

      <div className='card-shell space-y-4 p-4 sm:p-5'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-lg font-black text-white'>إنشاء طلب يدوي / محلي</h2>
            <p className='text-sm text-slate-400'>هذا المسار خاص بالأدمن فقط ولا يمر على المزودات أو تسعير الواجهة العامة.</p>
          </div>
          <div className='rounded-2xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-sm'>
            <div className='text-slate-300'>الربح المحسوب</div>
            <div className={`mt-1 text-xl font-black ${profitAmount >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              ${roundVisible(profitAmount).toFixed(2)}
            </div>
            <div className='text-xs text-slate-400'>{purchaseAmount > 0 ? `${roundVisible(profitPercent).toFixed(2)}%` : '0.00%'}</div>
          </div>
        </div>

        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
          <select
            className='input-shell'
            value={form.userId}
            onChange={(e) => setForm((prev) => ({ ...prev, userId: e.target.value }))}
          >
            <option value=''>اختر الزبون</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name} - {user.email}
              </option>
            ))}
          </select>

          <select
            className='input-shell'
            value={form.productId}
            onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value, packageKey: '', countValue: '1' }))}
          >
            <option value=''>اختر المنتج</option>
            {products.map((product) => (
              <option key={product._id} value={product._id}>
                {product.name} ({product.kind})
              </option>
            ))}
          </select>

          <select
            className='input-shell'
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as CreateStatus }))}
          >
            <option value='pending'>بانتظار التنفيذ</option>
            <option value='processing'>قيد التنفيذ</option>
            <option value='completed'>مكتمل مباشرة</option>
            <option value='cancelled'>ملغي</option>
          </select>

          {selectedProduct?.kind === 'package' ? (
            <select
              className='input-shell'
              value={form.packageKey}
              onChange={(e) => setForm((prev) => ({ ...prev, packageKey: e.target.value }))}
            >
              <option value=''>اختر الباقة</option>
              {availablePackages.map((pkg) => (
                <option key={pkg.key} value={pkg.key}>
                  {pkg.label}
                </option>
              ))}
            </select>
          ) : null}

          {selectedProduct?.kind === 'count' ? (
            <Input
              type='number'
              min={1}
              placeholder='الكمية'
              value={form.countValue}
              onChange={(e) => setForm((prev) => ({ ...prev, countValue: e.target.value }))}
            />
          ) : null}

          <Input
            placeholder='معرّف الحساب / تفاصيل التنفيذ'
            value={form.playerAccount}
            onChange={(e) => setForm((prev) => ({ ...prev, playerAccount: e.target.value }))}
          />

          <Input
            type='number'
            step='0.01'
            min={0}
            placeholder='سعر الشراء'
            value={form.purchaseAmount}
            onChange={(e) => setForm((prev) => ({ ...prev, purchaseAmount: e.target.value }))}
          />

          <Input
            type='number'
            step='0.01'
            min={0}
            placeholder='سعر البيع'
            value={form.saleAmount}
            onChange={(e) => setForm((prev) => ({ ...prev, saleAmount: e.target.value }))}
          />

          <Input value={`${roundVisible(profitAmount).toFixed(2)} USD`} readOnly />
          <Input value={`${purchaseAmount > 0 ? roundVisible(profitPercent).toFixed(2) : '0.00'}%`} readOnly />
        </div>

        <textarea
          className='input-shell min-h-28 w-full resize-y'
          placeholder='ملاحظات داخلية'
          value={form.note}
          onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
        />

        <div className='flex flex-wrap gap-2'>
          <Button
            onClick={createManualOrder}
            disabled={
              isSubmitting ||
              !form.userId ||
              !form.productId ||
              !form.playerAccount.trim() ||
              form.purchaseAmount === '' ||
              form.saleAmount === '' ||
              (selectedProduct?.kind === 'package' && !form.packageKey)
            }
          >
            {isSubmitting ? 'جارٍ الإنشاء...' : 'إنشاء الطلب اليدوي'}
          </Button>
          <Button variant='secondary' onClick={() => setForm(initialForm)} disabled={isSubmitting}>
            إعادة ضبط
          </Button>
        </div>
      </div>

      <div className='space-y-3'>
        {items.length === 0 ? <div className='card-shell p-6 text-center text-sm text-slate-400'>لا توجد طلبات يدوية حاليًا.</div> : null}
        {items.map((item) => (
          <div key={item._id} className='card-shell space-y-4 p-4 sm:p-5'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
              <div className='space-y-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='text-lg font-black text-white'>{item.productName}</div>
                  <span className='status-chip status-chip-warning'>{sourceLabel(item.source)}</span>
                  <span className={`status-chip ${statusChipClass(item.manualStatus)}`}>{manualStatusLabel(item.manualStatus)}</span>
                </div>
                <div className='text-sm text-slate-300'>
                  {item.userName}
                  {item.userEmail ? <span className='text-slate-500'> - {item.userEmail}</span> : null}
                </div>
                <div className='text-sm text-slate-400'>الحساب: {item.playerAccount}</div>
                <div className='text-sm text-slate-400'>
                  #{item.orderId.slice(-8)}
                  {item.packageKey ? <span> | الباقة: {item.packageKey}</span> : null}
                  {item.countValue ? <span> | الكمية: {item.countValue}</span> : null}
                </div>
              </div>

              <div className='grid min-w-[250px] gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm sm:grid-cols-2'>
                <Metric label='الشراء' value={`$${fromMinor(item.totalCostMinor).toFixed(2)}`} />
                <Metric label='البيع' value={`$${fromMinor(item.totalPriceMinor).toFixed(2)}`} />
                <Metric label='الربح' value={`$${fromMinor(item.profitMinor).toFixed(2)}`} tone={item.profitMinor >= 0 ? 'success' : 'danger'} />
                <Metric label='نسبة الربح' value={`${roundVisible(item.profitPercent).toFixed(2)}%`} />
              </div>
            </div>

            <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end'>
              <textarea
                className='input-shell min-h-24 w-full resize-y'
                placeholder='ملاحظة تنفيذ (اختياري)'
                value={notes[item._id] ?? item.note ?? ''}
                onChange={(e) => setNotes((prev) => ({ ...prev, [item._id]: e.target.value }))}
              />

              <div className='flex flex-wrap gap-2'>
                {isActionable(item.manualStatus) ? (
                  <>
                    <Button variant='secondary' onClick={() => updateStatus(item._id, 'pending')}>
                      انتظار
                    </Button>
                    <Button variant='secondary' onClick={() => updateStatus(item._id, 'processing')}>
                      معالجة
                    </Button>
                    <Button variant='secondary' onClick={() => updateStatus(item._id, 'done')}>
                      إكمال
                    </Button>
                    <Button variant='secondary' onClick={() => updateStatus(item._id, 'cancelled')}>
                      إلغاء
                    </Button>
                  </>
                ) : (
                  <span className={`status-chip ${statusChipClass(item.manualStatus)}`}>{manualStatusLabel(item.manualStatus)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminPageShell>
  )
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'danger'
}) {
  const toneClass = tone === 'success' ? 'text-emerald-300' : tone === 'danger' ? 'text-rose-300' : 'text-white'

  return (
    <div>
      <div className='text-xs text-slate-400'>{label}</div>
      <div className={`mt-1 text-base font-bold ${toneClass}`}>{value}</div>
    </div>
  )
}

function isActionable(status: ManualOrderRow['manualStatus']) {
  return status === 'pending' || status === 'processing'
}

function sourceLabel(source: ManualOrderRow['source']) {
  return source === 'admin_local' ? 'محلي من الأدمن' : 'صف تنفيذ يدوي'
}

function manualStatusLabel(status: ManualOrderRow['manualStatus']) {
  if (status === 'done') return 'مكتمل'
  if (status === 'cancelled') return 'ملغي'
  if (status === 'processing') return 'قيد التنفيذ'
  return 'بانتظار التنفيذ'
}

function statusChipClass(status: ManualOrderRow['manualStatus']) {
  if (status === 'done') return 'status-chip-success'
  if (status === 'cancelled') return 'status-chip-danger'
  return 'status-chip-warning'
}
