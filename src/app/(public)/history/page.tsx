export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { fromMinor } from '@/core/money'
import { requireAuth } from '@/modules/security/guards'
import { getCustomerHistory } from '@/features/customer/account.service'

type SearchParams = {
  type?: string
}

export default async function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireAuth().catch(() => null)
  if (!session) redirect('/login')

  const typeRaw = searchParams.type ?? 'all'
  const type = typeRaw === 'orders' || typeRaw === 'wallet' ? typeRaw : 'all'

  const history = await getCustomerHistory(session.sub, type)

  return (
    <section className='storefront-subpage-shell orders-shell space-y-4'>
      <div className='storefront-subpage-hero orders-filter-bar rounded-2xl p-5'>
        <span className='storefront-subpage-kicker'>Bily Card</span>
        <h1 className='storefront-subpage-title'>سجل النشاط</h1>
        <p className='mt-2 text-sm text-slate-300'>سجل موحّد للطلبات ومعاملات المحفظة بترتيب زمني واضح.</p>
      </div>

      <div className='orders-filter-bar flex flex-wrap gap-2 p-3'>
        <Link href='/history?type=all' className={type === 'all' ? 'btn-primary' : 'btn-secondary'}>
          الكل
        </Link>
        <Link href='/history?type=orders' className={type === 'orders' ? 'btn-primary' : 'btn-secondary'}>
          الطلبات
        </Link>
        <Link href='/history?type=wallet' className={type === 'wallet' ? 'btn-primary' : 'btn-secondary'}>
          المحفظة
        </Link>
        <span className='mr-auto text-xs text-slate-400'>{history.total} عنصر</span>
      </div>

      <div className='space-y-2'>
        {history.items.length === 0 ? (
          <div className='list-empty-shell p-6 text-center text-sm text-slate-400'>لا يوجد سجل ضمن هذا الفلتر.</div>
        ) : null}

        {history.items.map((item) => (
          <div key={`${item.kind}-${item.id}`} className='history-row flex items-center justify-between gap-3 p-4'>
            <div>
              <div className='font-semibold'>{item.title}</div>
              <div className='text-xs text-slate-400'>{formatHistorySub(item.sub)}</div>
              {item.kind === 'order' && item.balanceBeforeMinor != null && item.balanceAfterMinor != null ? (
                <div className='text-xs text-slate-400'>
                  قبل الطلب ${fromMinor(item.balanceBeforeMinor).toFixed(2)} | بعد الطلب ${fromMinor(item.balanceAfterMinor).toFixed(2)}
                </div>
              ) : item.kind === 'order' ? <div className='text-xs text-slate-500'>لا يوجد trail محفوظ لهذا الطلب</div> : null}
              {item.kind === 'order' && item.refundAmountMinor ? (
                <div className='text-xs text-emerald-300'>
                  تم رد ${fromMinor(item.refundAmountMinor).toFixed(2)}{item.refundedAt ? ` • ${new Date(item.refundedAt).toLocaleString('en-US', { timeZone: 'Asia/Beirut' })}` : ''}
                </div>
              ) : null}
              <div className='text-xs text-slate-500'>{new Date(item.createdAt).toLocaleString()}</div>
            </div>
            <div className={`text-lg font-black ${item.amountMinor >= 0 ? 'text-emerald-300' : 'text-cyan-300'}`}>
              {item.amountMinor >= 0 ? '+' : '-'}${fromMinor(Math.abs(item.amountMinor)).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function formatHistorySub(value: string) {
  return value
    .replace('completed', 'مكتمل')
    .replace('refunded', 'مسترجع')
    .replace('failed', 'فاشل')
    .replace('manual_pending', 'بانتظار المراجعة')
    .replace('processing', 'قيد المعالجة')
    .replace('manual', 'يدوي')
    .replace('provider', 'مباشر')
}
