'use client'

import { useMemo, useState } from 'react'
import { AdminPageShell } from '@/components/admin/admin-page-shell'
import { fromMinor } from '@/core/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ReportsPayload = {
  range: string
  from: string
  to: string
  summary: {
    ordersTotal: number
    completedTotal: number
    refundedTotal: number
    revenueMinor: number
    costMinor: number
    profitMinor: number
  }
  topProducts: Array<{ _id: string; qty: number; revenueMinor: number; profitMinor: number }>
  pendingDeposits: number
}

const ranges = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
] as const

export function AdminReportsDashboard({ initial }: { initial: ReportsPayload }) {
  const [data, setData] = useState(initial)
  const [range, setRange] = useState(initial.range || 'today')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)

  const completionRate = useMemo(() => {
    if (!data.summary.ordersTotal) return 0
    return Math.round((data.summary.completedTotal / data.summary.ordersTotal) * 100)
  }, [data.summary.completedTotal, data.summary.ordersTotal])
  const maxTopQty = useMemo(() => Math.max(1, ...data.topProducts.map((item) => item.qty)), [data.topProducts])

  async function refresh() {
    setLoading(true)
    const query =
      range === 'custom'
        ? `/api/admin/reports?range=custom&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        : `/api/admin/reports?range=${range}`

    const res = await fetch(query, { cache: 'no-store' })
    const json = await res.json()
    setData(json.data)
    setLoading(false)
  }

  return (
    <AdminPageShell title='التقارير' description='لوحة أداء حيّة للطلبات والأرباح مع فلاتر زمنية مباشرة.'>
      <div className='admin-filter-shell dashboard-filter-bar summary-panel p-3.5 sm:p-4'>
        <div className='inline-controls'>
          <label className='field-label'>
            <span>Range</span>
            <select className='select-shell w-44' value={range} onChange={(e) => setRange(e.target.value)}>
              {ranges.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {range === 'custom' ? (
            <>
              <label className='field-label'>
                <span>From</span>
                <Input type='date' value={from} onChange={(e) => setFrom(e.target.value)} className='w-44' />
              </label>
              <label className='field-label'>
                <span>To</span>
                <Input type='date' value={to} onChange={(e) => setTo(e.target.value)} className='w-44' />
              </label>
            </>
          ) : null}

          <Button className='px-4' variant='secondary' onClick={refresh} disabled={loading || (range === 'custom' && (!from || !to))}>
            {loading ? 'Loading...' : 'Apply'}
          </Button>
        </div>
      </div>

      <div className='grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5'>
        <Stat title='Orders' value={String(data.summary.ordersTotal)} />
        <Stat title='Completed' value={String(data.summary.completedTotal)} />
        <Stat title='Completion Rate' value={`${completionRate}%`} />
        <Stat title='Revenue' value={`$${fromMinor(data.summary.revenueMinor).toFixed(2)}`} />
        <Stat title='Profit' value={`$${fromMinor(data.summary.profitMinor).toFixed(2)}`} />
      </div>

      <div className='grid gap-3.5 lg:grid-cols-2'>
        <div className='admin-section-shell settings-section p-4 sm:p-5'>
          <div className='section-heading-row'>
            <h2 className='font-semibold'>Financial Snapshot</h2>
          </div>
          <div className='grid gap-2 text-sm'>
            <Row label='Cost' value={`$${fromMinor(data.summary.costMinor).toFixed(2)}`} />
            <Row label='الطلبات المسترجعة' value={String(data.summary.refundedTotal)} />
            <Row label='Pending Deposits' value={String(data.pendingDeposits)} />
            <Row label='From' value={new Date(data.from).toLocaleString()} />
            <Row label='To' value={new Date(data.to).toLocaleString()} />
          </div>
        </div>

        <div className='admin-section-shell settings-section p-4 sm:p-5'>
          <div className='section-heading-row'>
            <h2 className='font-semibold'>Top Products</h2>
          </div>
          <div className='space-y-2'>
            {data.topProducts.length === 0 ? <p className='text-sm text-slate-400'>لا توجد بيانات ضمن هذا النطاق.</p> : null}
            {data.topProducts.map((row) => (
              <div key={row._id} className='detail-row stat-card rounded-lg p-2.5 text-sm'>
                <div className='font-semibold'>{row._id}</div>
                <div className='mt-1 h-2 rounded-full bg-cyan-950/60'>
                  <div className='h-2 rounded-full bg-cyan-300/80' style={{ width: `${Math.max(8, Math.round((row.qty / maxTopQty) * 100))}%` }} />
                </div>
                <div className='mt-1 text-slate-300'>qty {row.qty}</div>
                <div className='text-xs text-slate-400'>
                  الإيراد ${fromMinor(row.revenueMinor).toFixed(2)}$ | الربح ${fromMinor(row.profitMinor).toFixed(2)}$
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminPageShell>
  )
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className='admin-kpi-card stat-card p-4'>
      <div className='stat-label'>{title}</div>
      <div className='admin-kpi-value stat-value'>{value}</div>
      <div className='admin-kpi-meta mt-2'>ملخص فوري ضمن النطاق الحالي</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='metric-row detail-row stat-card rounded-lg'>
      <span className='text-slate-400'>{label}</span>
      <span className='font-semibold text-cyan-100'>{value}</span>
    </div>
  )
}
