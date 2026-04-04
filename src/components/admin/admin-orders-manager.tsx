'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fromMinor } from '@/core/money'
import { AdminPageShell, AdminStatCard, AdminStatGrid } from '@/components/admin/admin-page-shell'
import { Button } from '@/components/ui/button'

type OrderRow = {
  _id: string
  productName: string
  totalPriceMinor: number
  totalCostMinor: number
  profitMinor: number
  status: string
  fulfillMode: string
  createdAt: string
  balanceBeforeMinor?: number
  balanceAfterMinor?: number
  refundAmountMinor?: number
  refundedAt?: string
}

type OrdersResponse = {
  items: OrderRow[]
  total: number
  page: number
  pageSize: number
}

export function AdminOrdersManager({ initial }: { initial: OrdersResponse }) {
  const router = useRouter()
  const [data, setData] = useState(initial)
  const [statusFilter, setStatusFilter] = useState('')
  const [message, setMessage] = useState('')

  const totals = useMemo(() => {
    const settled = data.items.filter((row) => row.status === 'completed')
    const revenue = settled.reduce((acc, row) => acc + row.totalPriceMinor, 0)
    const profit = settled.reduce((acc, row) => acc + row.profitMinor, 0)
    return { revenue, profit }
  }, [data.items])

  async function refresh() {
    const query = statusFilter ? `?status=${statusFilter}` : ''
    const res = await fetch(`/api/admin/orders${query}`, { cache: 'no-store' })
    const json = await res.json()
    setData(json.data)
  }

  async function updateStatus(orderId: string, action: 'accept' | 'reject') {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })

    if (!res.ok) {
      setMessage('فشل تحديث حالة الطلب')
      return
    }

    setMessage('تم تحديث الحالة')
    await refresh()
    router.refresh()
  }

  return (
    <AdminPageShell
      title='إدارة الطلبات'
      description='متابعة حالات الطلبات والأرباح بسرعة، مع فلترة مباشرة وتحديث للحالة من نفس الصفحة.'
      actions={
        <>
          <select className='input-shell w-52' value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value=''>كل الحالات</option>
            <option value='processing'>قيد المعالجة</option>
            <option value='completed'>مكتمل</option>
            <option value='failed'>فاشل</option>
            <option value='refunded'>مسترجع</option>
            <option value='manual_pending'>بانتظار المراجعة</option>
          </select>
          <Button variant='secondary' onClick={refresh}>
            تحديث
          </Button>
        </>
      }
    >
      {message ? <span className='text-xs text-cyan-300'>{message}</span> : null}

      <AdminStatGrid>
        <AdminStatCard label='عدد الطلبات' value={String(data.total)} />
        <AdminStatCard label='إجمالي الربح الظاهر' value={`$${fromMinor(totals.profit).toFixed(2)}`} tone='emerald' />
      </AdminStatGrid>

      <div className='admin-table-shell card-shell p-0'>
        <div className='admin-table-wrap'>
        <table className='admin-table min-w-full text-right text-sm'>
          <thead>
            <tr>
              <th className='admin-table-cell-compact'>المنتج</th>
              <th className='admin-table-cell-compact'>الإيراد</th>
              <th className='admin-table-cell-compact'>التكلفة</th>
              <th className='admin-table-cell-compact'>الربح</th>
              <th className='admin-table-cell-compact'>الحالة</th>
              <th className='admin-table-cell-compact'>قبل / بعد</th>
              <th className='admin-table-cell-compact'>التاريخ</th>
              <th className='admin-table-cell-compact'>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className='admin-table-cell py-8 text-center text-slate-400'>
                  لا توجد طلبات ضمن الفلتر الحالي.
                </td>
              </tr>
            ) : null}
            {data.items.map((order) => (
              <tr key={order._id} className='admin-table-row'>
                <td className='admin-table-cell font-semibold'>
                  <div className='admin-split-stat'>
                    <div className='admin-table-main'>{order.productName}</div>
                    {order.fulfillMode === 'manual' ? <div className='admin-inline-badge text-amber-300'>يدوي / محلي</div> : null}
                  </div>
                </td>
                <td className='admin-table-cell whitespace-nowrap'>${fromMinor(order.totalPriceMinor).toFixed(2)}</td>
                <td className='admin-table-cell whitespace-nowrap'>${fromMinor(order.totalCostMinor).toFixed(2)}</td>
                <td className='admin-table-cell whitespace-nowrap text-cyan-300'>${fromMinor(order.profitMinor).toFixed(2)}</td>
                <td className='admin-table-cell text-xs'>
                  <span className={`status-chip ${statusChipClass(order.status)}`}>{statusLabel(order.status)}</span>
                </td>
                <td className='admin-table-cell text-xs text-slate-400'>
                  {order.balanceBeforeMinor != null && order.balanceAfterMinor != null ? (
                    <div className='admin-split-stat'>
                      <div className='admin-table-sub'>
                        ${fromMinor(order.balanceBeforeMinor).toFixed(2)} {'->'} ${fromMinor(order.balanceAfterMinor).toFixed(2)}
                      </div>
                      {order.refundAmountMinor ? (
                        <div className='text-emerald-300'>
                          مرتجع ${fromMinor(order.refundAmountMinor).toFixed(2)}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span className='text-slate-500'>لا يوجد trail محفوظ</span>
                  )}
                </td>
                <td className='admin-table-cell whitespace-nowrap text-xs text-slate-400'>{formatStableDateTime(order.createdAt)}</td>
                <td className='admin-table-cell'>
                  <div className='admin-action-cell'>
                    {isActionableStatus(order.status) ? (
                      <>
                        <button className='btn-primary min-h-0 px-3 py-1.5 text-xs' onClick={() => updateStatus(order._id, 'accept')}>
                          قبول
                        </button>
                        <button className='btn-secondary min-h-0 px-3 py-1.5 text-xs' onClick={() => updateStatus(order._id, 'reject')}>
                          رفض
                        </button>
                      </>
                    ) : (
                      <span className={`status-chip ${statusChipClass(order.status)}`}>{statusLabel(order.status)}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </AdminPageShell>
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

function isActionableStatus(status: string) {
  return status === 'processing' || status === 'manual_pending'
}

function statusChipClass(status: string) {
  const value = status.toLowerCase()
  if (value.includes('complete')) return 'status-chip-success'
  if (value.includes('refund') || value.includes('fail')) return 'status-chip-danger'
  return 'status-chip-warning'
}

function statusLabel(status: string) {
  if (status === 'completed') return 'مكتمل'
  if (status === 'refunded') return 'مسترجع'
  if (status === 'failed') return 'فاشل'
  if (status === 'manual_pending') return 'بانتظار المراجعة'
  return 'قيد المعالجة'
}

