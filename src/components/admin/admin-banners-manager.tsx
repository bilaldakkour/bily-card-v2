'use client'

import { useState } from 'react'
import { AdminPageShell } from '@/components/admin/admin-page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AdminBanner = {
  id: string
  title: string
  subtitle: string
  imageUrl: string
  linkUrl?: string
  badge?: string
  isActive: boolean
  sortOrder: number
}

export function AdminBannersManager({ initialBanners }: { initialBanners: AdminBanner[] }) {
  const [banners, setBanners] = useState(initialBanners)
  const [bannerFiles, setBannerFiles] = useState<Record<string, File | null>>({})
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    linkUrl: '',
    badge: '',
    sortOrder: '',
    isActive: true,
    image: null as File | null,
  })

  async function refresh() {
    const res = await fetch('/api/admin/banners', { cache: 'no-store' })
    const json = await res.json()
    setBanners(json.data ?? [])
  }

  async function createBanner() {
    if (!form.image) {
      setStatus('اختر صورة أولاً')
      return
    }

    setSubmitting(true)
    setStatus('')

    try {
      const body = new FormData()
      body.set('title', form.title)
      body.set('subtitle', form.subtitle)
      body.set('linkUrl', form.linkUrl)
      body.set('badge', form.badge)
      body.set('sortOrder', form.sortOrder)
      body.set('isActive', String(form.isActive))
      body.set('image', form.image)

      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        body,
      })

      if (!res.ok) {
        setStatus('فشل رفع البانر')
        return
      }

      await refresh()
      setForm({
        title: '',
        subtitle: '',
        linkUrl: '',
        badge: '',
        sortOrder: '',
        isActive: true,
        image: null,
      })
      setStatus('تمت إضافة البانر')
    } finally {
      setSubmitting(false)
    }
  }

  async function saveBanner(banner: AdminBanner) {
    const body = new FormData()
    body.set('title', banner.title)
    body.set('subtitle', banner.subtitle)
    body.set('imageUrl', banner.imageUrl ?? '')
    body.set('removeImage', 'false')
    body.set('linkUrl', banner.linkUrl ?? '')
    body.set('badge', banner.badge ?? '')
    body.set('isActive', String(banner.isActive))
    body.set('sortOrder', String(banner.sortOrder))

    const nextImage = bannerFiles[banner.id]
    if (nextImage) {
      body.set('image', nextImage)
    }

    const res = await fetch(`/api/admin/banners/${banner.id}`, {
      method: 'PATCH',
      body,
    })

    setStatus(res.ok ? 'تم حفظ التعديلات' : 'فشل حفظ التعديلات')
    if (res.ok) {
      setBannerFiles((current) => ({ ...current, [banner.id]: null }))
      await refresh()
    }
  }

  async function deleteBanner(id: string) {
    const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' })
    setStatus(res.ok ? 'تم حذف البانر' : 'فشل حذف البانر')
    if (res.ok) await refresh()
  }

  function updateBanner(id: string, key: keyof AdminBanner, value: string | boolean | number) {
    setBanners((current) => current.map((banner) => (banner.id === id ? { ...banner, [key]: value } : banner)))
  }

  async function hideBannerImage(banner: AdminBanner) {
    setBanners((current) =>
      current.map((item) => (item.id === banner.id ? { ...item, imageUrl: '' } : item))
    )
    setBannerFiles((current) => ({ ...current, [banner.id]: null }))

    const body = new FormData()
    body.set('title', banner.title)
    body.set('subtitle', banner.subtitle)
    body.set('imageUrl', '')
    body.set('removeImage', 'true')
    body.set('linkUrl', banner.linkUrl ?? '')
    body.set('badge', banner.badge ?? '')
    body.set('isActive', String(banner.isActive))
    body.set('sortOrder', String(banner.sortOrder))

    const res = await fetch(`/api/admin/banners/${banner.id}`, {
      method: 'PATCH',
      body,
    })

    setStatus(res.ok ? 'تم إخفاء صورة البانر' : 'فشل إخفاء صورة البانر')
    if (res.ok) {
      await refresh()
    }
  }

  return (
    <AdminPageShell
      title='إدارة البنرات'
      description='إضافة وحذف وترتيب بنرات الصفحة الرئيسية مع رفع الصور من الهاتف أو الكمبيوتر.'
    >
      <div className='card-shell space-y-3 p-4'>
        <div className='surface-head'>
          <h2 className='font-semibold text-white'>إضافة بانر جديد</h2>
          <p className='mt-1 text-xs text-slate-400'>ارفع صورة جديدة وحدد النصوص والرابط والترتيب.</p>
        </div>

        <div className='grid gap-3 sm:grid-cols-2'>
          <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder='عنوان البانر' />
          <Input value={form.badge} onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value }))} placeholder='شارة صغيرة' />
          <Input value={form.subtitle} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} placeholder='وصف قصير' />
          <Input value={form.linkUrl} onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))} placeholder='الرابط عند الضغط' />
          <Input
            type='number'
            value={form.sortOrder}
            onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
            placeholder='الترتيب'
          />
          <label className='input-shell flex items-center gap-2 text-sm text-slate-300'>
            <input
              type='checkbox'
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            ظاهر في السلايدر
          </label>
        </div>

        <div className='space-y-2'>
          <label className='block text-sm text-slate-300'>صورة البانر</label>
          <input
            type='file'
            accept='image/*'
            onChange={(e) => setForm((p) => ({ ...p, image: e.target.files?.[0] ?? null }))}
            className='block w-full text-sm text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-cyan-500/15 file:px-3 file:py-2 file:text-cyan-100'
          />
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Button type='button' onClick={createBanner} disabled={submitting}>
            {submitting ? 'جارٍ الرفع...' : 'إضافة البانر'}
          </Button>
          {status ? <span className='text-xs text-cyan-300'>{status}</span> : null}
        </div>
      </div>

      <div className='grid gap-3'>
        {banners.map((banner) => (
          <div key={banner.id} className='card-shell space-y-3 p-4'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-start'>
              {banner.imageUrl ? (
                <img src={banner.imageUrl} alt={banner.title} className='h-32 w-full rounded-2xl object-cover lg:w-64' />
              ) : null}

              <div className='grid flex-1 gap-3 sm:grid-cols-2'>
                <Input value={banner.title} onChange={(e) => updateBanner(banner.id, 'title', e.target.value)} placeholder='عنوان' />
                <Input value={banner.badge ?? ''} onChange={(e) => updateBanner(banner.id, 'badge', e.target.value)} placeholder='شارة' />
                <Input value={banner.subtitle} onChange={(e) => updateBanner(banner.id, 'subtitle', e.target.value)} placeholder='وصف' />
                <Input value={banner.linkUrl ?? ''} onChange={(e) => updateBanner(banner.id, 'linkUrl', e.target.value)} placeholder='رابط' />
                <Input
                  type='number'
                  value={String(banner.sortOrder)}
                  onChange={(e) => updateBanner(banner.id, 'sortOrder', Number(e.target.value || '1'))}
                  placeholder='الترتيب'
                />
                <label className='input-shell flex items-center gap-2 text-sm text-slate-300'>
                  <input
                    type='checkbox'
                    checked={banner.isActive}
                    onChange={(e) => updateBanner(banner.id, 'isActive', e.target.checked)}
                  />
                  ظاهر في السلايدر
                </label>
                <label className='input-shell flex flex-col items-start gap-2 text-sm text-slate-300 sm:col-span-2'>
                  <span>تبديل صورة البانر</span>
                  <input
                    type='file'
                    accept='image/*'
                    onChange={(e) =>
                      setBannerFiles((current) => ({
                        ...current,
                        [banner.id]: e.target.files?.[0] ?? null,
                      }))
                    }
                    className='block w-full text-sm text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-cyan-500/15 file:px-3 file:py-2 file:text-cyan-100'
                  />
                </label>
                <Button
                  type='button'
                  variant='secondary'
                  className='sm:col-span-2'
                  onClick={() => hideBannerImage(banner)}
                >
                  إخفاء الصورة الحالية
                </Button>
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <Button type='button' variant='secondary' onClick={() => saveBanner(banner)}>
                حفظ
              </Button>
              <Button type='button' variant='secondary' className='border-rose-400/40 text-rose-200' onClick={() => deleteBanner(banner.id)}>
                حذف
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AdminPageShell>
  )
}
