'use client'

import { useState } from 'react'
import { fromMinor } from '@/core/money'

type OrderListItem = {
  _id: string
  productName: string
  totalPriceMinor: number
  status: string
  fulfillMode: string
  createdAt: string
  balanceBeforeMinor?: number
  balanceAfterMinor?: number
  refundAmountMinor?: number
  refundedAt?: string
}

type OrdersPayload = {
  items: OrderListItem[]
  total: number
  page: number
  pageSize: number
}

export function OrdersClient({ initial }: { initial: OrdersPayload }) {
  const [orders] = useState(initial)
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function loadDetail(id: string) {
    setLoading(true)
    const res = await fetch(`/api/orders/${id}`, { cache: 'no-store' })
    const json = await res.json()
    setSelected(json.data)
    setLoading(false)
  }

  return (
    <section className='orders-shell space-y-4'>
      <h1 className='text-2xl font-bold'>الطلبات</h1>
      <div className='grid gap-3.5 lg:grid-cols-[1fr_1fr]'>
        <div className='space-y-2'>
          {orders.items.length === 0 ? <div className='list-empty-shell p-4 text-sm text-slate-300'>لا توجد طلبات حالياً.</div> : null}
          {orders.items.map((order) => (
            <button
              type='button'
              key={order._id}
              className='order-row w-full p-4 text-right'
              onClick={() => loadDetail(order._id)}
            >
              <div className='font-semibold'>{order.productName}</div>
              <div className='order-meta-row mt-1'>
                <span className='text-sm text-slate-400'>${fromMinor(order.totalPriceMinor).toFixed(2)}</span>
                <span className={`status-chip ${statusChipClass(order.status)}`}>{statusLabel(order.status)}</span>
                <span className='status-chip status-chip-neutral'>{order.fulfillMode === 'manual' ? 'يدوي' : 'مباشر'}</span>
              </div>
              {order.balanceBeforeMinor != null && order.balanceAfterMinor != null ? (
                <div className='mt-2 text-xs text-slate-400'>
                  قبل ${fromMinor(order.balanceBeforeMinor).toFixed(2)}$ | بعد ${fromMinor(order.balanceAfterMinor).toFixed(2)}$
                </div>
              ) : (
                <div className='mt-2 text-xs text-slate-500'>لا يوجد trail محفوظ لهذا الطلب</div>
              )}
            </button>
          ))}
        </div>

        <div className='transaction-panel p-4'>
          {loading ? <p>Loading...</p> : null}
          {!selected && !loading ? <p className='list-empty-shell p-4 text-sm text-slate-300'>اختر طلبًا لعرض الـ lifecycle و الـ audit logs.</p> : null}
          {selected ? (
            <div className='space-y-3'>
              <div>
                <h2 className='font-semibold'>{selected.order.productName}</h2>
                <div className='order-meta-row mt-1'>
                  <p className='text-sm text-slate-400'>{statusLabel(selected.order.status)}</p>
                  <span className={`status-chip ${statusChipClass(selected.order.status)}`}>{statusLabel(selected.order.status)}</span>
                </div>
              </div>
              <div className='order-row px-3 py-2 text-sm'>Account: {selected.order.playerAccount}</div>
              <div className='order-row px-3 py-2 text-sm'>Total: ${fromMinor(selected.order.totalPriceMinor).toFixed(2)}</div>
              {selected.order.balanceBeforeMinor != null && selected.order.balanceAfterMinor != null ? (
                <div className='order-row px-3 py-2 text-sm'>
                  الرصيد قبل الطلب: ${fromMinor(selected.order.balanceBeforeMinor).toFixed(2)} | الرصيد بعد الطلب: ${fromMinor(selected.order.balanceAfterMinor).toFixed(2)}
                </div>
              ) : (
                <div className='order-row px-3 py-2 text-sm text-slate-400'>لا يوجد trail محفوظ لهذا الطلب</div>
              )}
              {selected.order.refundAmountMinor ? (
                <div className='order-row px-3 py-2 text-sm text-emerald-300'>
                  قيمة الاسترجاع: ${fromMinor(selected.order.refundAmountMinor).toFixed(2)}
                  {selected.order.refundedAt ? ` • ${formatStableDateTime(selected.order.refundedAt)}` : ''}
                </div>
              ) : null}
              <div className='space-y-2'>
                <h3 className='font-semibold'>Audit Log</h3>
                {selected.audits.map((a: any) => (
                  <div key={a._id} className='history-row p-2 text-sm'>
                    <div className='font-semibold'>{a.action}</div>
                    <div className='text-slate-300'>{a.message}</div>
                    <div className='text-xs text-slate-500'>{formatStableDateTime(a.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function formatStableDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Beirut',
  }).format(new Date(value))
}

function statusChipClass(status: string) {
  const value = status.toLowerCase()
  if (value.includes('complete') || value.includes('success') || value.includes('fulfilled') || value.includes('approved')) return 'status-chip-success'
  if (value.includes('pending') || value.includes('process') || value.includes('review')) return 'status-chip-warning'
  if (value.includes('fail') || value.includes('reject') || value.includes('cancel') || value.includes('refund')) return 'status-chip-danger'
  return 'status-chip-neutral'
}

function statusLabel(status: string) {
  if (status === 'completed') return 'مكتمل'
  if (status === 'refunded') return 'مسترجع'
  if (status === 'failed') return 'فاشل'
  if (status === 'manual_pending') return 'بانتظار المراجعة'
  return 'قيد المعالجة'
}
