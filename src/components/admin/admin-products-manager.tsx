'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { AdminPageShell, AdminStatCard, AdminStatGrid } from '@/components/admin/admin-page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { adminCatalogCategories } from '@/modules/catalog/categories'
import { decimalToMinor, minorToDecimal } from '@/lib/pricing/price'

type AdminProduct = {
  _id: string
  slug: string
  name: string
  description?: string
  thumbnail?: string | null
  category: string
  kind: 'package' | 'count' | 'manual'
  visible: boolean
  hiddenFromCustomer?: boolean
  active: boolean
  forceOutOfStock?: boolean
  manualStock: number | null
  routingMode: 'manual_only' | 'provider_only' | 'cheapest_with_fallback'
  countConfig?: { min?: number | null; max?: number | null; step?: number | null; manualUnitPrice?: number | null }
  packages: Array<{
    key: string
    label: string
    sortOrder: number
    visible: boolean
    active: boolean
    manualPriceMinor?: number | null
    manualStock?: number | null
  }>
  pricingRule: {
    defaultMarginPct: number
    countMarginPct: number
    roundingMode: 'nearest_0_01' | 'nearest_0_05' | 'nearest_1_00'
    isDiscountEnabled: boolean
    customerDiscountPct: number
    packageMarginOverrides?: Record<string, number>
  } | null
  providerLinks: Array<{
    packageKey: string | null
    provider: 'daily_card' | 'go4_card'
    providerProductId: string
    providerVariantId: string | null
    isPrimary: boolean
    active?: boolean
    enabled?: boolean
    priority?: number
    forceProvider?: boolean
  }>
}

const defaultPricing = {
  defaultMarginPct: 15,
  countMarginPct: 15,
  roundingMode: 'nearest_0_01' as const,
  isDiscountEnabled: false,
  customerDiscountPct: 0,
  packageMarginOverrides: {} as Record<string, number>,
}

function formatPreviewMoney(value: number) {
  if (!Number.isFinite(value) || value === 0) return '$0.00'
  if (Math.abs(value) >= 0.01) return `$${value.toFixed(2)}`
  return `$${value.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')}`
}

export function AdminProductsManager({ initialProducts }: { initialProducts: AdminProduct[] }) {
  const [products, setProducts] = useState(() => initialProducts.map(normalizeProductForForm))
  const [selectedId, setSelectedId] = useState(initialProducts[0]?._id ?? '')
  const [status, setStatus] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [search, setSearch] = useState('')

  const selected = useMemo(() => products.find((p) => p._id === selectedId) ?? null, [products, selectedId])
  const filteredProducts = useMemo(() => {
    const query = normalizeAdminProductSearch(search)
    if (!query) return products

    return products.filter((product) => {
      const haystack = normalizeAdminProductSearch(
        [
          product.name,
          product.slug,
          product.category,
          product.kind,
          product.description,
          product.routingMode,
          ...product.providerLinks.flatMap((link) => [link.provider, link.providerProductId, link.providerVariantId]),
        ]
          .filter(Boolean)
          .join(' ')
      )

      return haystack.includes(query)
    })
  }, [products, search])
  const productStats = useMemo(
    () => ({
      total: products.length,
      active: products.filter((product) => product.active).length,
      visible: products.filter((product) => product.visible && !product.hiddenFromCustomer).length,
      providerLinked: products.filter((product) => product.providerLinks.length > 0).length,
    }),
    [products]
  )

  useEffect(() => {
    if (products.length === 0) {
      if (selectedId) setSelectedId('')
      return
    }

    if (!selectedId || !products.some((product) => product._id === selectedId)) {
      setSelectedId(products[0]?._id ?? '')
    }
  }, [products, selectedId])

  async function refresh() {
    const res = await fetch('/api/admin/products', { cache: 'no-store' })
    const json = await res.json()
    const normalized: AdminProduct[] = (json.data ?? []).map(normalizeProductForForm)
    setProducts(normalized)
    setPendingImage(null)
    setSelectedId((currentSelectedId) =>
      normalized.some((product) => product._id === currentSelectedId) ? currentSelectedId : (normalized[0]?._id ?? '')
    )
  }

  async function createProduct() {
    const payload = {
      slug: `new-product-${Date.now()}`,
      name: 'New Product',
      description: '',
      thumbnail: null,
      category: adminCatalogCategories[0],
      kind: 'package',
      visible: true,
      hiddenFromCustomer: false,
      active: true,
      forceOutOfStock: false,
      manualStock: null,
      routingMode: 'provider_only',
      countConfig: { min: null, max: null, step: null, manualUnitPrice: null },
    }

    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      setStatus('فشل إنشاء المنتج')
      return
    }

    await refresh()
    setStatus('تم إنشاء المنتج')
  }

  async function saveCore() {
    if (!selected) return

    const res = await fetch(`/api/admin/products/${selected._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: selected.slug,
        name: selected.name,
        description: selected.description ?? '',
        thumbnail: selected.thumbnail ?? null,
        category: selected.category,
        kind: selected.kind,
        visible: selected.visible,
        hiddenFromCustomer: selected.hiddenFromCustomer ?? false,
        active: selected.active,
        forceOutOfStock: selected.forceOutOfStock ?? false,
        manualStock: selected.manualStock,
        routingMode: selected.routingMode,
        countConfig: normalizeCountConfigForForm(selected.countConfig),
      }),
    })

    if (!res.ok) {
      setStatus('فشل حفظ بيانات المنتج')
      return
    }

    setStatus('تم حفظ بيانات المنتج')
    await refresh()
  }

  async function saveCoreWithUpload() {
    if (!selected) return

    if (!pendingImage) {
      await saveCore()
      return
    }

    const payload = {
      slug: selected.slug,
      name: selected.name,
      description: selected.description ?? '',
      thumbnail: selected.thumbnail ?? null,
      category: selected.category,
      kind: selected.kind,
      visible: selected.visible,
      hiddenFromCustomer: selected.hiddenFromCustomer ?? false,
      active: selected.active,
      forceOutOfStock: selected.forceOutOfStock ?? false,
      manualStock: selected.manualStock,
      routingMode: selected.routingMode,
      countConfig: normalizeCountConfigForForm(selected.countConfig),
    }

    const body = new FormData()
    body.set('slug', payload.slug)
    body.set('name', payload.name)
    body.set('description', payload.description)
    body.set('thumbnail', payload.thumbnail ?? '')
    body.set('category', payload.category)
    body.set('kind', payload.kind)
    body.set('visible', String(payload.visible))
    body.set('hiddenFromCustomer', String(payload.hiddenFromCustomer))
    body.set('active', String(payload.active))
    body.set('forceOutOfStock', String(payload.forceOutOfStock))
    body.set('manualStock', payload.manualStock === null ? '' : String(payload.manualStock))
    body.set('routingMode', payload.routingMode)
    body.set('countMin', payload.countConfig.min === null ? '' : String(payload.countConfig.min))
    body.set('countMax', payload.countConfig.max === null ? '' : String(payload.countConfig.max))
    body.set('countStep', payload.countConfig.step === null ? '' : String(payload.countConfig.step))
    body.set(
      'countManualUnitPrice',
      payload.countConfig.manualUnitPrice === null ? '' : String(payload.countConfig.manualUnitPrice)
    )
    body.set('image', pendingImage)

    const res = await fetch(`/api/admin/products/${selected._id}`, {
      method: 'PATCH',
      body,
    })

    if (!res.ok) {
      setStatus('ظپط´ظ„ ط­ظپط¸ طµظˆط±ط© ط§ظ„ظ…ظ†طھط¬')
      return
    }

    setStatus('طھظ… ط­ظپط¸ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ†طھط¬')
    setPendingImage(null)
    await refresh()
  }

  async function savePackages() {
    if (!selected) return
    const sanitizedPackages = selected.packages.map((pkg) => ({
      label: pkg.label,
      price: Number((pkg.manualPriceMinor ?? 0) / 100),
      active: !!pkg.active,
      visible: !!pkg.visible,
    }))

    const res = await fetch(`/api/admin/products/${selected._id}/packages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packages: sanitizedPackages }),
    })

    if (!res.ok) {
      setStatus('فشل حفظ الباقات')
      return
    }

    setStatus('تم حفظ الباقات')
    await refresh()
  }

  async function savePricing() {
    if (!selected) return

    const payload = selected.pricingRule ?? defaultPricing
    const res = await fetch(`/api/admin/products/${selected._id}/pricing`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      setStatus('فشل حفظ إعدادات التسعير')
      return
    }

    setStatus('تم حفظ إعدادات التسعير')
    await refresh()
  }

  async function saveProviders() {
    if (!selected) return

    const res = await fetch(`/api/admin/products/${selected._id}/providers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: selected.providerLinks }),
    })

    if (!res.ok) {
      setStatus('فشل حفظ روابط المزود')
      return
    }

    setStatus('تم حفظ روابط المزود')
    await refresh()
  }

  async function loadPreview() {
    if (!selected) return

    const res = await fetch(`/api/admin/products/${selected._id}/preview`, { cache: 'no-store' })
    if (!res.ok) {
      setStatus('فشل تحميل preview')
      return
    }

    const json = await res.json()
    setPreview(json.data.detail)
  }

  async function deleteSelected() {
    if (!selected) return
    const res = await fetch(`/api/admin/products/${selected._id}`, { method: 'DELETE' })
    if (!res.ok) {
      setStatus('فشل حذف المنتج')
      return
    }

    setStatus('تم حذف المنتج')
    setSelectedId('')
    await refresh()
  }

  if (products.length === 0) {
    return (
      <AdminPageShell
        title='إدارة المنتجات'
        description='إدارة المنتجات والخيارات والتسعير والربط مع المزودين من مكان واحد.'
        actions={<Button onClick={createProduct}>New Product</Button>}
      >
        <div className='admin-empty-state px-6 py-10'>
          <div className='text-base font-semibold text-white'>لا توجد منتجات بعد</div>
          <p className='mt-2 text-sm text-slate-300'>أضف أول منتج ليظهر هنا مباشرة داخل لوحة الإدارة.</p>
        </div>
      </AdminPageShell>
    )
  }

  if (!selected) return null

  return (
    <AdminPageShell
      title='إدارة المنتجات'
      description='ترتيب المنتج، تفاصيله، الباقات، التسعير، وروابط المزودين من نفس الصفحة.'
      actions={
        <>
          <Button onClick={createProduct} variant='secondary'>
            إضافة منتج
          </Button>
          <Button onClick={deleteSelected} variant='secondary' className='border-rose-400/40 text-rose-200'>
            حذف المنتج
          </Button>
        </>
      }
    >
      {status ? <span className='text-xs text-cyan-300'>{status}</span> : null}

      <AdminStatGrid>
        <AdminStatCard label='إجمالي المنتجات' value={String(productStats.total)} />
        <AdminStatCard label='المنتجات النشطة' value={String(productStats.active)} tone='emerald' />
        <AdminStatCard label='المنتجات الظاهرة' value={String(productStats.visible)} tone='cyan' />
        <AdminStatCard label='المنتجات المرتبطة بمزوّد' value={String(productStats.providerLinked)} tone='amber' />
      </AdminStatGrid>

      <div className='admin-filter-shell space-y-3 p-4'>
        <div className='surface-head flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <h2 className='text-base font-semibold text-white'>دليل المنتجات</h2>
            <p className='mt-1 text-xs text-slate-400'>المنتجات الحالية معروضة هنا مباشرة مع بحث محلي سريع وحالة الإدارة.</p>
          </div>
          <div className='w-full max-w-xl'>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='ابحث بالاسم أو الرابط أو الفئة أو النوع...'
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className='admin-empty-state px-4 py-8'>
            <div className='text-sm font-semibold text-white'>لا توجد نتائج مطابقة</div>
            <p className='mt-1 text-xs text-slate-400'>جرّب تعديل كلمات البحث لإظهار المنتجات الموجودة.</p>
          </div>
        ) : null}
      </div>

      <div className='grid gap-3 lg:grid-cols-[360px_1fr]'>
        <div className='card-shell max-h-[75vh] overflow-auto p-3'>
          <div className='surface-head mb-3'>
            <h2 className='font-semibold text-white'>قائمة المنتجات</h2>
            <p className='mt-1 text-xs text-slate-400'>
              {filteredProducts.length === products.length
                ? 'كل المنتجات الحالية معروضة هنا. اختر أي منتج للبدء بالتعديل.'
                : `تمت مطابقة ${filteredProducts.length} من أصل ${products.length} منتج.`}
            </p>
          </div>

          <div className='space-y-2'>
            {filteredProducts.map((product) => (
              <button
                key={product._id}
                type='button'
                onClick={() => {
                  setSelectedId(product._id)
                  setPreview(null)
                  setPendingImage(null)
                }}
                className={`w-full rounded-2xl border p-3 text-right transition ${
                  selectedId === product._id
                    ? 'border-cyan-300 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]'
                    : 'border-cyan-400/20 hover:border-cyan-300/30 hover:bg-white/[0.03]'
                }`}
              >
                <div className='flex items-start gap-3'>
                  <div className='flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-400/15 bg-white/[0.03]'>
                    {product.thumbnail ? (
                      <img src={product.thumbnail} alt={product.name} className='h-full w-full object-cover' />
                    ) : (
                      <span className='text-[10px] text-slate-500'>No image</span>
                    )}
                  </div>

                  <div className='min-w-0 flex-1 space-y-2'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0'>
                        <div className='truncate text-sm font-semibold text-white'>{product.name}</div>
                        <div className='truncate text-[11px] text-slate-400'>{product.slug}</div>
                      </div>
                      <span className='admin-inline-badge'>{selectedId === product._id ? 'Editing' : 'Edit'}</span>
                    </div>

                    <div className='flex flex-wrap gap-1.5'>
                      <span className='admin-inline-badge'>{product.category}</span>
                      <span className='admin-inline-badge'>{product.kind}</span>
                      <span className='admin-inline-badge'>{getAdminProductRoutingLabel(product)}</span>
                      <span className={`admin-inline-badge ${product.active ? 'text-emerald-200' : 'text-rose-200'}`}>
                        {product.active ? 'active' : 'inactive'}
                      </span>
                      <span
                        className={`admin-inline-badge ${
                          product.visible && !product.hiddenFromCustomer ? 'text-cyan-200' : 'text-amber-200'
                        }`}
                      >
                        {product.visible && !product.hiddenFromCustomer ? 'visible' : 'hidden'}
                      </span>
                    </div>

                    <div className='grid gap-2 text-[11px] text-slate-300 sm:grid-cols-2'>
                      <div className='rounded-xl border border-cyan-400/10 bg-white/[0.02] px-2.5 py-2'>
                        <div className='text-[10px] text-slate-500'>Price hint</div>
                        <div className='mt-1 font-semibold text-white'>{getAdminProductPriceHint(product)}</div>
                      </div>
                      <div className='rounded-xl border border-cyan-400/10 bg-white/[0.02] px-2.5 py-2'>
                        <div className='text-[10px] text-slate-500'>Management mode</div>
                        <div className='mt-1 font-semibold text-white'>
                          {product.providerLinks.length > 0 ? `${product.providerLinks.length} provider link(s)` : 'No provider links'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className='space-y-3'>
          <SectionCard title='Core' description='البيانات الأساسية التي تظهر وتعتمد عليها بنية المنتج.'>
            <div className='grid gap-2 sm:grid-cols-2'>
              <Input value={selected.name} onChange={(e) => setSelectedValue('name', e.target.value)} placeholder='Name' />
              <Input value={selected.slug} onChange={(e) => setSelectedValue('slug', e.target.value)} placeholder='Slug' />
              <Input
                value={selected.description ?? ''}
                onChange={(e) => setSelectedValue('description', e.target.value)}
                placeholder='Description'
              />
              <Input
                value={selected.thumbnail ?? ''}
                onChange={(e) => setSelectedValue('thumbnail', e.target.value || null)}
                placeholder='Image URL'
              />
              <select
                className='select-shell'
                value={selected.category}
                onChange={(e) => setSelectedValue('category', e.target.value)}
              >
                {adminCatalogCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                className='select-shell'
                value={selected.kind}
                onChange={(e) => setSelectedValue('kind', e.target.value as AdminProduct['kind'])}
              >
                <option value='package'>package</option>
                <option value='count'>count</option>
                <option value='manual'>manual</option>
              </select>
              <select
                className='select-shell'
                value={selected.routingMode}
                onChange={(e) => setSelectedValue('routingMode', e.target.value as AdminProduct['routingMode'])}
              >
                <option value='manual_only'>manual_only</option>
                <option value='provider_only'>provider_only</option>
                <option value='cheapest_with_fallback'>cheapest_with_fallback</option>
              </select>
              <Input
                type='number'
                value={selected.manualStock ?? ''}
                onChange={(e) => setSelectedValue('manualStock', e.target.value ? Number(e.target.value) : null)}
                placeholder='Manual Stock'
              />
            </div>

            <div className='grid gap-3 lg:grid-cols-[1fr_220px]'>
              <label className='space-y-2 rounded-2xl border border-cyan-400/15 bg-white/[0.02] p-3 text-sm text-slate-200'>
                <span className='block text-xs text-slate-400'>Upload Product Image</span>
                <input
                  type='file'
                  accept='image/*'
                  onChange={(e) => setPendingImage(e.target.files?.[0] ?? null)}
                  className='block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-cyan-400/20 file:px-3 file:py-2 file:text-cyan-100'
                />
                <span className='block text-xs text-slate-500'>
                  {pendingImage ? pendingImage.name : 'The file will be saved into public/uploads/products.'}
                </span>
              </label>

              <div className='flex min-h-[140px] items-center justify-center overflow-hidden rounded-2xl border border-cyan-400/15 bg-white/[0.02] p-3'>
                {pendingImage ? (
                  <img
                    src={URL.createObjectURL(pendingImage)}
                    alt='Pending product upload'
                    className='h-full max-h-[132px] w-full rounded-xl object-cover'
                  />
                ) : selected.thumbnail ? (
                  <img
                    src={selected.thumbnail}
                    alt={selected.name}
                    className='h-full max-h-[132px] w-full rounded-xl object-cover'
                  />
                ) : (
                  <span className='text-xs text-slate-500'>No image selected</span>
                )}
              </div>
            </div>

            {selected.kind === 'count' ? (
              <div className='grid gap-2 sm:grid-cols-2'>
                <Input
                  type='number'
                  value={selected.countConfig?.min ?? ''}
                  onChange={(e) => updateCountConfig('min', e.target.value ? Number(e.target.value) : null)}
                  placeholder='countMin'
                />
                <Input
                  type='number'
                  value={selected.countConfig?.max ?? ''}
                  onChange={(e) => updateCountConfig('max', e.target.value ? Number(e.target.value) : null)}
                  placeholder='countMax'
                />
                <Input
                  type='number'
                  value={selected.countConfig?.step ?? ''}
                  onChange={(e) => updateCountConfig('step', e.target.value ? Number(e.target.value) : null)}
                  placeholder='countStep'
                />
                <Input
                  type='number'
                  step='0.000001'
                  value={selected.countConfig?.manualUnitPrice ?? ''}
                  onChange={(e) => updateCountConfig('manualUnitPrice', e.target.value ? Number(e.target.value) : null)}
                  placeholder='Price per 1 unit'
                />
              </div>
            ) : null}

            <div className='flex flex-wrap gap-3 text-sm'>
              <label className='inline-flex items-center gap-1'>
                <input type='checkbox' checked={selected.visible} onChange={(e) => setSelectedValue('visible', e.target.checked)} />
                visible
              </label>
              <label className='inline-flex items-center gap-1'>
                <input type='checkbox' checked={selected.active} onChange={(e) => setSelectedValue('active', e.target.checked)} />
                active
              </label>
              <label className='inline-flex items-center gap-1'>
                <input
                  type='checkbox'
                  checked={selected.forceOutOfStock ?? false}
                  onChange={(e) => setSelectedValue('forceOutOfStock', e.target.checked)}
                />
                forceOutOfStock
              </label>
              <label className='inline-flex items-center gap-1'>
                <input
                  type='checkbox'
                  checked={selected.hiddenFromCustomer ?? false}
                  onChange={(e) => setSelectedValue('hiddenFromCustomer', e.target.checked)}
                />
                hiddenFromCustomer
              </label>
            </div>

            <Button onClick={saveCoreWithUpload}>Save Core</Button>
          </SectionCard>

          <SectionCard
            title='Packages / Variants'
            description='إدارة الباقات الظاهرة للعميل مع الترتيب والسعر.'
            action={
              <Button
                variant='secondary'
                onClick={() =>
                  setSelectedValue('packages', [
                    ...selected.packages,
                    {
                      key: `pkg-${Date.now()}`,
                      label: 'New Package',
                      sortOrder: selected.packages.length + 1,
                      visible: true,
                      active: true,
                    },
                  ])
                }
              >
                Add Package
              </Button>
            }
          >
            <div className='space-y-2'>
              {selected.packages.map((pkg, index) => (
                <div key={`${pkg.key}-${index}`} className='rounded-xl border border-cyan-400/20 p-3'>
                  <div className='grid gap-2 sm:grid-cols-2'>
                    <Input value={pkg.key} onChange={(e) => updatePackage(index, 'key', e.target.value)} placeholder='key' />
                    <Input value={pkg.label} onChange={(e) => updatePackage(index, 'label', e.target.value)} placeholder='label' />
                    <Input
                      type='number'
                      value={pkg.sortOrder}
                      onChange={(e) => updatePackage(index, 'sortOrder', Number(e.target.value))}
                      placeholder='sort'
                    />
                    <Input
                      type='number'
                      step='0.01'
                      value={pkg.manualPriceMinor === null || pkg.manualPriceMinor === undefined ? '' : minorToDecimal(pkg.manualPriceMinor)}
                      onChange={(e) =>
                        updatePackage(index, 'manualPriceMinor', e.target.value ? decimalToMinor(e.target.value) : null)
                      }
                      placeholder='price'
                    />
                  </div>
                  <div className='mt-2 flex flex-wrap gap-2 text-xs'>
                    <label className='inline-flex items-center gap-1'>
                      <input type='checkbox' checked={pkg.visible} onChange={(e) => updatePackage(index, 'visible', e.target.checked)} />
                      visible
                    </label>
                    <label className='inline-flex items-center gap-1'>
                      <input type='checkbox' checked={pkg.active} onChange={(e) => updatePackage(index, 'active', e.target.checked)} />
                      active
                    </label>
                    <button
                      type='button'
                      className='text-rose-300 underline'
                      onClick={() =>
                        setSelectedValue(
                          'packages',
                          selected.packages.filter((_, idx) => idx !== index)
                        )
                      }
                    >
                      remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={savePackages}>Save Packages</Button>
          </SectionCard>

          <SectionCard title='Pricing Controls' description='إعدادات الهوامش والخصومات وآلية التقريب.'>
            <div className='grid gap-2 sm:grid-cols-2'>
              <Input
                type='number'
                step='1'
                value={(selected.pricingRule ?? defaultPricing).defaultMarginPct}
                onChange={(e) => setPricingValue('defaultMarginPct', Number(e.target.value))}
                placeholder='package default margin %'
              />
              <Input
                type='number'
                step='1'
                value={(selected.pricingRule ?? defaultPricing).countMarginPct}
                onChange={(e) => setPricingValue('countMarginPct', Number(e.target.value))}
                placeholder='count margin %'
              />
              <Input
                type='number'
                step='1'
                value={(selected.pricingRule ?? defaultPricing).customerDiscountPct}
                onChange={(e) => setPricingValue('customerDiscountPct', Number(e.target.value))}
                placeholder='discount %'
              />
              <select
                className='select-shell'
                value={(selected.pricingRule ?? defaultPricing).roundingMode}
                onChange={(e) => setPricingValue('roundingMode', e.target.value)}
              >
                <option value='nearest_0_01'>nearest_0_01</option>
                <option value='nearest_0_05'>nearest_0_05</option>
                <option value='nearest_1_00'>nearest_1_00</option>
              </select>
            </div>

            {selected.kind !== 'count' && selected.packages.length > 0 ? (
              <div className='space-y-2 rounded-2xl border border-cyan-400/15 bg-white/[0.02] p-3'>
                <div className='text-sm font-semibold text-white'>Package Margin Overrides</div>
                <p className='text-xs text-slate-400'>إذا تركت الحقل فارغًا، سيأخذ الباكدج النسبة العامة للمنتج.</p>
                <div className='grid gap-2 sm:grid-cols-2'>
                  {selected.packages.map((pkg) => (
                    <div key={pkg.key} className='rounded-xl border border-cyan-400/12 p-2.5'>
                      <div className='mb-2 text-sm text-slate-200'>{pkg.label}</div>
                      <Input
                        type='number'
                        step='1'
                        value={(selected.pricingRule?.packageMarginOverrides ?? {})[pkg.key] ?? ''}
                        onChange={(e) => updatePackageMarginOverride(pkg.key, e.target.value)}
                        placeholder={`default ${String((selected.pricingRule ?? defaultPricing).defaultMarginPct)}%`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <label className='inline-flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={(selected.pricingRule ?? defaultPricing).isDiscountEnabled}
                onChange={(e) => setPricingValue('isDiscountEnabled', e.target.checked)}
              />
              discount enabled
            </label>

            <Button onClick={savePricing}>Save Pricing</Button>
          </SectionCard>

          <SectionCard
            title='Provider Links'
            description='ربط المنتج بالمزود المناسب مع ترتيب الأولوية.'
            action={
              <Button
                variant='secondary'
                onClick={() =>
                  setSelectedValue('providerLinks', [
                    ...selected.providerLinks,
                    {
                      packageKey: selected.kind === 'count' ? null : selected.packages[0]?.key ?? null,
                      provider: 'daily_card',
                      providerProductId: '',
                      providerVariantId: null,
                      isPrimary: true,
                      enabled: true,
                      active: true,
                      priority: 100,
                      forceProvider: false,
                    },
                  ])
                }
              >
                Add Link
              </Button>
            }
          >
            <div className='space-y-2'>
              {selected.providerLinks.map((link, index) => (
                <div key={`${index}-${link.providerProductId}`} className='rounded-xl border border-cyan-400/20 p-3'>
                  <div className='grid gap-2 sm:grid-cols-2'>
                    <Input
                      value={link.packageKey ?? ''}
                      onChange={(e) => updateProviderLink(index, 'packageKey', e.target.value || null)}
                      placeholder='packageKey (null for count)'
                    />
                    <select
                      className='select-shell'
                      value={link.provider}
                      onChange={(e) => updateProviderLink(index, 'provider', e.target.value)}
                    >
                      <option value='daily_card'>daily_card</option>
                      <option value='go4_card'>go4_card</option>
                    </select>
                    <Input
                      value={link.providerProductId}
                      onChange={(e) => updateProviderLink(index, 'providerProductId', e.target.value)}
                      placeholder='providerProductId'
                    />
                    <Input
                      value={link.providerVariantId ?? ''}
                      onChange={(e) => updateProviderLink(index, 'providerVariantId', e.target.value || null)}
                      placeholder='providerVariantId'
                    />
                    <Input
                      type='number'
                      value={link.priority ?? 100}
                      onChange={(e) => updateProviderLink(index, 'priority', Number(e.target.value || '100'))}
                      placeholder='priority'
                    />
                  </div>
                  <div className='mt-2 flex flex-wrap gap-2 text-xs'>
                    <label className='inline-flex items-center gap-1'>
                      <input type='checkbox' checked={link.isPrimary} onChange={(e) => updateProviderLink(index, 'isPrimary', e.target.checked)} />
                      primary
                    </label>
                    <label className='inline-flex items-center gap-1'>
                      <input
                        type='checkbox'
                        checked={link.enabled ?? link.active ?? true}
                        onChange={(e) => {
                          updateProviderLink(index, 'enabled', e.target.checked)
                          updateProviderLink(index, 'active', e.target.checked)
                        }}
                      />
                      enabled
                    </label>
                    <label className='inline-flex items-center gap-1'>
                      <input
                        type='checkbox'
                        checked={link.forceProvider ?? false}
                        onChange={(e) => updateProviderLink(index, 'forceProvider', e.target.checked)}
                      />
                      force
                    </label>
                    <button
                      type='button'
                      className='text-rose-300 underline'
                      onClick={() =>
                        setSelectedValue(
                          'providerLinks',
                          selected.providerLinks.filter((_, idx) => idx !== index)
                        )
                      }
                    >
                      remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={saveProviders}>Save Provider Links</Button>
          </SectionCard>

          <SectionCard
            title='Final Visible Price Preview'
            description='معاينة سريعة للسعر والظهور النهائي قبل الحفظ.'
            action={
              <Button variant='secondary' onClick={loadPreview}>
                Refresh Preview
              </Button>
            }
          >
            {preview ? (
              <div className='space-y-2 text-sm'>
                <div>Product: {preview.name}</div>
                {preview.packages?.map((pkg: any) => (
                  <div key={pkg.key} className='rounded-lg bg-bg/70 p-2'>
                    {pkg.label} - ${pkg.finalPrice.toFixed(2)} - {pkg.available ? 'in_stock' : 'out_of_stock'}
                  </div>
                ))}
                {preview.count ? (
                  <div className='rounded-lg bg-bg/70 p-2'>
                    Count unit: {formatPreviewMoney(preview.count.unitPrice)} (min {preview.count.min})
                  </div>
                ) : null}
              </div>
            ) : (
              <p className='text-sm text-slate-300'>اضغط Refresh Preview لرؤية السعر النهائي الظاهر للعميل.</p>
            )}
          </SectionCard>
        </div>
      </div>
    </AdminPageShell>
  )

  function setSelectedValue<K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) {
    setProducts((prev) => prev.map((p) => (p._id === selectedId ? { ...p, [key]: value } : p)))
  }

  function updatePackage(index: number, key: string, value: unknown) {
    if (!selected) return
    const next = [...selected.packages]
    next[index] = { ...next[index], [key]: value }
    setSelectedValue('packages', next)
  }

  function updateProviderLink(index: number, key: string, value: unknown) {
    if (!selected) return
    const next = [...selected.providerLinks]
    next[index] = { ...next[index], [key]: value }
    setSelectedValue('providerLinks', next)
  }

  function setPricingValue(key: string, value: unknown) {
    if (!selected) return
    const pricing = { ...(selected.pricingRule ?? defaultPricing), [key]: value }
    setSelectedValue('pricingRule', pricing)
  }

  function updatePackageMarginOverride(packageKey: string, value: string) {
    if (!selected) return

    const currentOverrides = { ...((selected.pricingRule ?? defaultPricing).packageMarginOverrides ?? {}) }
    if (value === '') {
      delete currentOverrides[packageKey]
    } else {
      currentOverrides[packageKey] = Number(value)
    }

    const pricing = { ...(selected.pricingRule ?? defaultPricing), packageMarginOverrides: currentOverrides }
    setSelectedValue('pricingRule', pricing)
  }

  function updateCountConfig(key: 'min' | 'max' | 'step' | 'manualUnitPrice', value: number | null) {
    if (!selected) return
    const next = { ...(selected.countConfig ?? {}), [key]: value }
    setSelectedValue('countConfig', next)
  }
}

function normalizeAdminProductSearch(value: string) {
  return value.trim().toLocaleLowerCase()
}

function getAdminProductRoutingLabel(product: AdminProduct) {
  if (product.routingMode === 'manual_only') return 'manual mode'
  if (product.routingMode === 'provider_only') return 'provider mode'
  return 'hybrid mode'
}

function getAdminProductPriceHint(product: AdminProduct) {
  if (product.kind === 'count' && product.countConfig?.manualUnitPrice) {
    return `${formatPreviewMoney(product.countConfig.manualUnitPrice)} / unit`
  }

  const packagePrices = product.packages
    .map((pkg) => pkg.manualPriceMinor)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  if (packagePrices.length > 0) {
    return formatPreviewMoney(Math.min(...packagePrices) / 100)
  }

  return product.providerLinks.length > 0 ? 'Provider priced' : 'No price yet'
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className='card-shell space-y-3 p-4'>
      <div className='surface-head flex items-center justify-between gap-3'>
        <div>
          <h2 className='font-semibold text-white'>{title}</h2>
          {description ? <p className='mt-1 text-xs text-slate-400'>{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function normalizeProductForForm(product: AdminProduct): AdminProduct {
  return {
    ...product,
    countConfig: normalizeCountConfigForForm(product.countConfig),
  }
}

function normalizeCountConfigForForm(countConfig: AdminProduct['countConfig']) {
  return {
    min: countConfig?.min ?? null,
    max: countConfig?.max ?? null,
    step: countConfig?.step ?? null,
    manualUnitPrice:
      countConfig?.manualUnitPrice ??
      ((countConfig as any)?.manualUnitPriceMinor !== null && (countConfig as any)?.manualUnitPriceMinor !== undefined
        ? Number((countConfig as any).manualUnitPriceMinor) / 100
        : null),
  }
}
