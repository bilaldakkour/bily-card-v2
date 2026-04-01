export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { connectDb } from '@/modules/db/connection'
import { ManualOrderModel, OrderModel, ProductModel, UserModel, WalletDepositRequestModel } from '@/domain/models'

export default async function AdminDashboardPage() {
  await connectDb()

  const [products, orders, pendingDeposits, users, manualPending] = await Promise.all([
    ProductModel.countDocuments({}),
    OrderModel.countDocuments({}),
    WalletDepositRequestModel.countDocuments({ status: 'pending' }),
    UserModel.countDocuments({}),
    ManualOrderModel.countDocuments({ status: { $in: ['pending', 'processing'] } }),
  ])

  const quickLinks = [
    {
      label: 'إدارة البنرات',
      href: '/admin/banners',
      description: 'رفع الصور، ترتيب السلايدر، وتفعيل أو إيقاف أي بانر.',
    },
    {
      label: 'إدارة المنتجات',
      href: '/admin/products',
      description: 'إضافة المنتجات، تعديلها، وربطها بالتسعير والمزودين.',
    },
    {
      label: 'الطلبات',
      href: '/admin/orders',
      description: 'متابعة حالات الطلبات وتحديثها بسرعة من مكان واحد.',
    },
    {
      label: 'الطلبات اليدوية',
      href: '/admin/manual-orders',
      description: 'مراجعة الطلبات اليدوية التي تحتاج متابعة أو تنفيذ.',
    },
    {
      label: 'طلبات الإيداع',
      href: '/admin/deposits',
      description: 'قبول أو رفض الإيداعات المعلقة ومتابعة الملاحظات.',
    },
    {
      label: 'التقارير',
      href: '/admin/reports',
      description: 'قراءة أرقام المنصة والحركة اليومية بشكل أسرع.',
    },
  ]

  return (
    <section className='dashboard-shell text-right'>
      <div className='home-hero-shell overflow-hidden'>
        <div className='home-hero-glow home-hero-glow-cyan' />
        <div className='home-hero-glow home-hero-glow-emerald' />

        <div className='home-hero-grid'>
          <div className='home-hero-main'>
            <span className='home-hero-badge'>لوحة الإدارة</span>
            <h1 className='home-hero-title text-white'>إدارة Bily Card من مكان واحد</h1>
            <p className='home-hero-subtitle'>
              مساحة مرتبة لمتابعة المنتجات والطلبات والإيداعات والمستخدمين، مع وصول سريع لأكثر الأدوات استخدامًا داخل المنصة.
            </p>

            <div className='home-hero-actions'>
              <Link href='/admin/products' className='btn-primary'>
                إدارة المنتجات
              </Link>
              <Link href='/admin/orders' className='btn-secondary'>
                مراجعة الطلبات
              </Link>
            </div>
          </div>

          <div className='home-hero-highlights'>
            <HighlightCard title='طلبات تحتاج متابعة' value={manualPending} tone='amber' />
            <HighlightCard title='إيداعات معلقة' value={pendingDeposits} tone='amber' />
            <HighlightCard title='عدد المنتجات' value={products} tone='cyan' />
            <HighlightCard title='عدد المستخدمين' value={users} tone='emerald' />
          </div>
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
        <StatCard title='المنتجات' value={products} meta='إجمالي العناصر المنشورة' tone='cyan' />
        <StatCard title='الطلبات' value={orders} meta='كل الطلبات المسجلة' tone='cyan' />
        <StatCard title='الإيداعات المعلقة' value={pendingDeposits} meta='بانتظار المراجعة' tone='amber' />
        <StatCard title='المستخدمون' value={users} meta='الحسابات داخل المنصة' tone='emerald' />
        <StatCard title='الطلبات اليدوية' value={manualPending} meta='تحتاج تنفيذ أو متابعة' tone='amber' />
      </div>

      <div className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
        <div className='card-shell p-4 sm:p-5'>
          <div className='surface-head flex items-center justify-between gap-3'>
            <div>
              <h2 className='text-lg font-bold text-white'>الوصول السريع</h2>
              <p className='mt-1 text-sm text-slate-300'>اختصارات عملية لأكثر الأقسام استخدامًا داخل لوحة الإدارة.</p>
            </div>
            <span className='rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200'>
              {quickLinks.length} أقسام
            </span>
          </div>

          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className='group rounded-2xl border border-cyan-400/16 bg-white/[0.03] p-4 transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.05]'
              >
                <div className='mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-400/10 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.12)]'>
                  →
                </div>
                <div className='text-base font-bold text-white'>{item.label}</div>
                <p className='mt-2 text-sm leading-6 text-slate-300'>{item.description}</p>
                <div className='mt-4 text-xs font-semibold text-cyan-200 transition group-hover:text-cyan-100'>فتح القسم</div>
              </Link>
            ))}
          </div>
        </div>

        <div className='card-shell p-4 sm:p-5'>
          <div className='surface-head'>
            <h2 className='text-lg font-bold text-white'>نظرة سريعة</h2>
            <p className='mt-1 text-sm text-slate-300'>ملخص سريع لمساعدتك قبل الدخول إلى الأقسام التفصيلية.</p>
          </div>

          <div className='space-y-3'>
            <MetricRow label='حالة الطلبات اليدوية' value={manualPending > 0 ? 'تحتاج متابعة' : 'مستقرة'} tone={manualPending > 0 ? 'amber' : 'emerald'} />
            <MetricRow label='حالة الإيداعات' value={pendingDeposits > 0 ? 'معلّقة' : 'لا يوجد انتظار'} tone={pendingDeposits > 0 ? 'amber' : 'emerald'} />
            <MetricRow label='المنتجات المنشورة' value={`${products} منتج`} tone='cyan' />
            <MetricRow label='إجمالي المستخدمين' value={`${users} مستخدم`} tone='cyan' />
            <MetricRow label='إجمالي الطلبات' value={`${orders} طلب`} tone='cyan' />
          </div>
        </div>
      </div>
    </section>
  )
}

function HighlightCard({
  title,
  value,
  tone,
}: {
  title: string
  value: number
  tone: 'cyan' | 'amber' | 'emerald'
}) {
  const toneClass =
    tone === 'amber'
      ? 'text-amber-300'
      : tone === 'emerald'
        ? 'text-emerald-300'
        : 'text-cyan-300'

  return (
    <div className='home-highlight-card text-right'>
      <div className='text-xs text-slate-400'>{title}</div>
      <div className={`mt-2 text-2xl font-black ${toneClass}`}>{value}</div>
    </div>
  )
}

function StatCard({
  title,
  value,
  meta,
  tone,
}: {
  title: string
  value: number
  meta: string
  tone: 'cyan' | 'amber' | 'emerald'
}) {
  const toneClass =
    tone === 'amber'
      ? 'text-amber-300'
      : tone === 'emerald'
        ? 'text-emerald-300'
        : 'text-cyan-300'

  return (
    <div className='card-shell p-4'>
      <div className='stat-label'>{title}</div>
      <div className={`mt-2 text-3xl font-black ${toneClass}`}>{value}</div>
      <div className='stat-meta mt-2'>{meta}</div>
    </div>
  )
}

function MetricRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'cyan' | 'amber' | 'emerald'
}) {
  const toneClass =
    tone === 'amber'
      ? 'text-amber-300'
      : tone === 'emerald'
        ? 'text-emerald-300'
        : 'text-cyan-300'

  return (
    <div className='metric-row'>
      <span className='text-sm text-slate-300'>{label}</span>
      <span className={`text-sm font-bold ${toneClass}`}>{value}</span>
    </div>
  )
}
