export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { fromMinor } from '@/core/money'
import { requireAuth } from '@/modules/security/guards'
import { getCustomerProfileOverview } from '@/features/customer/account.service'

export default async function ProfilePage() {
  const session = await requireAuth().catch(() => null)
  if (!session) redirect('/login')

  const profile = await getCustomerProfileOverview(session.sub)

  return (
    <section className='storefront-subpage-shell dashboard-shell space-y-5 md:space-y-6'>
      <div id='level-progress' className='storefront-subpage-hero user-panel-shell section-card rounded-2xl p-5 md:p-6'>
        <span className='storefront-subpage-kicker'>Bily Card</span>
        <h1 className='storefront-subpage-title'>الملف الشخصي</h1>
        <p className='storefront-subpage-copy'>نظرة سريعة على حسابك والطلبات والمحفظة من نفس نسق الصفحة الرئيسية.</p>
      </div>

      <div id='account-report' className='grid gap-3 md:grid-cols-2 md:gap-4'>
        <div className='user-panel-shell card-shell section-card space-y-2 p-4 md:p-5'>
          <h2 className='font-semibold'>بيانات الحساب</h2>
          <div className='card-divider' />
          <Row label='الاسم' value={profile.user.name} />
          <Row label='البريد' value={profile.user.email} />
          <Row label='الدور' value={profile.user.role} />
          <Row label='الحالة' value={profile.user.isActive ? 'نشط' : 'غير نشط'} />
          <Row label='تاريخ الانضمام' value={new Date(profile.user.createdAt).toLocaleDateString()} />
        </div>

        <div className='user-panel-shell card-shell section-card space-y-2 p-4 md:p-5'>
          <h2 className='font-semibold'>ملخص النشاط</h2>
          <div className='card-divider' />
          <Row label='الرصيد الحالي' value={`$${fromMinor(profile.user.walletBalanceMinor).toFixed(2)}`} />
          <Row label='إجمالي الطلبات' value={String(profile.summary.ordersTotal)} />
          <Row label='طلبات مكتملة' value={String(profile.summary.completedTotal)} />
          <Row label='طلبات مسترجعة' value={String(profile.summary.refundedTotal)} />
          <Row label='إجمالي المصروف' value={`$${fromMinor(profile.summary.spentMinor).toFixed(2)}`} />
          <Row label='إيداعات معلّقة' value={String(profile.pendingDeposits)} />
        </div>
      </div>

      <div className='user-panel-shell card-shell section-card p-4 md:p-5'>
        <div className='section-heading-row mb-3'>
          <h2 className='font-semibold'>آخر الطلبات</h2>
          <Link href='/orders' className='text-sm text-cyan-300 underline'>
            عرض الكل
          </Link>
        </div>

        <div className='space-y-2'>
          {profile.recentOrders.length === 0 ? <p className='text-sm text-slate-400'>لا توجد طلبات بعد.</p> : null}
          {profile.recentOrders.map((order: any) => (
            <div key={String(order._id)} className='compact-stat detail-row stat-card rounded-lg p-3 text-sm'>
              <div className='font-semibold'>{order.productName}</div>
              <div className='text-xs text-slate-400'>
                {order.status} / {order.fulfillMode}
              </div>
              <div className='text-cyan-300'>${fromMinor(order.totalPriceMinor).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className='inline-controls'>
        <Link href='/wallet' className='btn-secondary'>
          إدارة المحفظة
        </Link>
        <Link href='/history' className='btn-secondary'>
          السجل الكامل
        </Link>
        <Link href='/support' className='btn-secondary'>
          الدعم
        </Link>
      </div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='compact-stat detail-row stat-card flex items-center justify-between px-3 py-2 text-sm'>
      <span className='text-slate-400'>{label}</span>
      <span className='font-semibold text-cyan-100'>{value}</span>
    </div>
  )
}
