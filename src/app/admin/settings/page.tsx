import { AdminPageShell } from '@/components/admin/admin-page-shell'

export default function AdminSettingsPage() {
  return (
    <AdminPageShell title='الإعدادات' description='نقاط الضبط الأمنية والتشغيلية العامة في النسخة الحالية.'>
      <div className='grid gap-3.5 md:grid-cols-2'>
        <div className='settings-section space-y-2 p-4 text-sm'>
          <div className='section-heading-row'>
            <h2 className='font-semibold'>Security</h2>
          </div>
          <p className='settings-row text-slate-300'>Cookie-based auth + role guards مفعّلة.</p>
          <p className='settings-row text-slate-300'>Rate limiting مطبّق على نقاط حساسة.</p>
          <p className='settings-row text-slate-300'>حدود API تمنع تسريب provider internals للعميل.</p>
        </div>

        <div className='settings-section space-y-2 p-4 text-sm'>
          <div className='section-heading-row'>
            <h2 className='font-semibold'>Operations</h2>
          </div>
          <p className='settings-row text-slate-300'>إعدادات المزوّدين تُدار من صفحة Providers.</p>
          <p className='settings-row text-slate-300'>التحكم بالتسعير/المخزون من Products Manager.</p>
          <p className='settings-row text-slate-300'>تقارير الأداء متاحة من صفحة Reports.</p>
        </div>
      </div>
    </AdminPageShell>
  )
}
