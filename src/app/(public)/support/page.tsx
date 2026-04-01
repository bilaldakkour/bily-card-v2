export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { fromMinor } from '@/core/money'
import { getSession } from '@/modules/security/session'
import { getSupportSnapshot } from '@/features/customer/account.service'

export default async function SupportPage() {
  const session = await getSession()
  const snapshot = session ? await getSupportSnapshot(session.sub) : null

  return (
    <section className='space-y-4'>
      <div className='rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-[#0f1730] to-[#111b37] p-5'>
        <h1 className='text-2xl font-black'>الدعم والمساعدة</h1>
        <p className='mt-2 text-sm text-slate-300'>
          فريق Bily Card متاح لمشاكل الطلبات، الرصيد، وتأخر التنفيذ. اختر المسار المناسب للحصول على حل أسرع.
        </p>
      </div>

      <div className='grid gap-3 md:grid-cols-3'>
        <HelpCard title='مشكلة طلب' desc='راجع حالة الطلب أولًا ثم شارك رقم الطلب مع الدعم.' cta='اذهب للطلبات' href='/orders' />
        <HelpCard title='مشكلة محفظة' desc='تحقق من سجل المعاملات وطلبات الإيداع قبل فتح تذكرة.' cta='اذهب للمحفظة' href='/wallet' />
        <HelpCard title='إدارة الحساب' desc='حدّث بياناتك الأساسية وتحقق من حالة الحساب.' cta='الملف الشخصي' href='/profile' />
      </div>

      {session && snapshot ? (
        <div className='grid gap-3 lg:grid-cols-2'>
          <div className='card-shell p-4'>
            <h2 className='mb-2 font-semibold'>آخر الطلبات</h2>
            <div className='space-y-2'>
              {snapshot.recentOrders.length === 0 ? <p className='text-sm text-slate-400'>لا توجد طلبات حديثة.</p> : null}
              {snapshot.recentOrders.map((order: any) => (
                <div key={String(order._id)} className='rounded-lg border border-cyan-400/20 p-2 text-sm'>
                  <div className='font-semibold'>{order.productName}</div>
                  <div className='text-xs text-slate-400'>{order.status}</div>
                  {order.failureCode ? <div className='text-xs text-rose-300'>failure: {order.failureCode}</div> : null}
                </div>
              ))}
            </div>
          </div>

          <div className='card-shell p-4'>
            <h2 className='mb-2 font-semibold'>طلبات الإيداع المعلقة</h2>
            <div className='space-y-2'>
              {snapshot.pendingDeposits.length === 0 ? <p className='text-sm text-slate-400'>لا يوجد طلبات معلّقة حاليًا.</p> : null}
              {snapshot.pendingDeposits.map((deposit: any) => (
                <div key={String(deposit._id)} className='rounded-lg border border-cyan-400/20 p-2 text-sm'>
                  <div className='font-semibold text-cyan-200'>${fromMinor(deposit.amountMinor).toFixed(2)}</div>
                  <div className='text-xs text-slate-400'>{new Date(deposit.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className='card-shell p-5 text-sm text-slate-300'>
          سجّل الدخول لعرض حالتك الحالية ومشكلاتك المحتملة بسرعة.
          <div className='mt-3'>
            <Link href='/login' className='btn-primary inline-flex'>
              تسجيل الدخول
            </Link>
          </div>
        </div>
      )}

      <div className='card-shell p-4 text-sm'>
        <h2 className='mb-2 font-semibold'>خطوات الدعم السريع</h2>
        <ol className='list-decimal space-y-1 pr-5 text-slate-300'>
          <li>احفظ رقم الطلب أو وقت عملية المحفظة.</li>
          <li>تأكد من Player ID قبل الإرسال.</li>
          <li>شارك التفاصيل الدقيقة بدل وصف عام للمشكلة.</li>
        </ol>
      </div>
    </section>
  )
}

function HelpCard({ title, desc, cta, href }: { title: string; desc: string; cta: string; href: string }) {
  return (
    <div className='card-shell space-y-2 p-4'>
      <h2 className='font-semibold'>{title}</h2>
      <p className='text-sm text-slate-300'>{desc}</p>
      <Link href={href} className='btn-secondary inline-flex'>
        {cta}
      </Link>
    </div>
  )
}
