'use client'

import { History } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CatalogDetail } from '@/domain/types/catalog'
type OrderDetailPayload = {
  order: {
    _id?: string
    productName: string
    productSlug: string
    packageKey: string | null
    countValue: number | null
    totalPriceMinor: number
    status: string
    fulfillMode: string
    createdAt: string
    updatedAt: string
    playerAccount: string
  }
  audits: Array<{
    _id?: string
    action: string
    actorType: string
    message: string
    createdAt: string
  }>
}

export function ProductPopup({
  product,
  mobileStandalone = false,
}: {
  product: CatalogDetail
  mobileStandalone?: boolean
}) {
  const firstPackage = product.packages[0]
  const countMin = product.count?.min ?? 1
  const countMax = product.count?.max ?? countMin
  const countStep = product.count?.step ?? 1

  const [account, setAccount] = useState('')
  const [packageKey, setPackageKey] = useState(firstPackage?.key ?? '')
  const [countValue, setCountValue] = useState(product.count?.current ?? countMin)
  const [countInput, setCountInput] = useState(String(product.count?.current ?? countMin))
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [recentAccounts, setRecentAccounts] = useState<string[]>([])
  const [showRecentAccounts, setShowRecentAccounts] = useState(false)
  const [pricingMode, setPricingMode] = useState<'quantity' | 'price'>('quantity')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<OrderDetailPayload | null>(null)
  const [mounted, setMounted] = useState(false)
  const recentAccountsKey = `bily:recent-accounts:${product.slug}`

  const selectedPackage = useMemo(
    () => product.packages.find((pkg) => pkg.key === packageKey) ?? firstPackage,
    [product.packages, packageKey, firstPackage]
  )

  const countTotal = useMemo(() => {
    if (product.kind !== 'count' || !product.count) return 0
    return product.count.unitPrice * countValue
  }, [product.kind, product.count, countValue])

  const total = useMemo(() => {
    if (product.kind === 'count' && product.count) {
      if (pricingMode === 'price') {
        const parsed = Number(countInput)
        return Number.isFinite(parsed) ? parsed : 0
      }
      return countTotal
    }
    return selectedPackage?.finalPrice ?? 0
  }, [product.kind, product.count, pricingMode, countInput, countTotal, selectedPackage])

  const quantityFromPrice = useMemo(() => {
    if (product.kind !== 'count' || !product.count || product.count.unitPrice <= 0) return countValue
    const rawQuantity = Math.floor(total / product.count.unitPrice)
    return clamp(rawQuantity || countMin, countMin, countMax)
  }, [product.kind, product.count, total, countValue, countMin, countMax])

  const canSubmitPackage = product.kind !== 'package' || Boolean(selectedPackage?.available)
  const canSubmit = !loading && Boolean(account) && product.available && canSubmitPackage

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(recentAccountsKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      setRecentAccounts(parsed.filter((value) => typeof value === 'string').slice(0, 7))
    } catch {}
  }, [recentAccountsKey])

  async function submitOrder() {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSlug: product.slug,
          account,
          packageKey: product.kind === 'package' ? packageKey : undefined,
          countValue:
            product.kind === 'count'
              ? pricingMode === 'price'
                ? quantityFromPrice
                : countValue
              : undefined,
        }),
      })

      const json = await response.json().catch(() => null)

      if (!response.ok) {
        setMessage('فشل تنفيذ الطلب')
        return
      }

      const orderId = json?.data?.orderId as string | undefined
      if (orderId) {
        const detailResponse = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' })
        const detailJson = await detailResponse.json().catch(() => null)

        if (detailResponse.ok && detailJson?.data) {
          setCreatedOrder({
            ...detailJson.data,
            order: {
              ...detailJson.data.order,
              _id: orderId,
            },
          })
          setOrderDetailsOpen(true)
        }
      }

      try {
        const nextRecentAccounts = [account, ...recentAccounts.filter((value) => value !== account)].slice(0, 7)
        setRecentAccounts(nextRecentAccounts)
        window.localStorage.setItem(recentAccountsKey, JSON.stringify(nextRecentAccounts))
      } catch {}

      setMessage('تم إنشاء الطلب بنجاح')
    } finally {
      setLoading(false)
    }
  }
  function commitCountInput() {
    const text = countInput.trim()
    if (text === '') {
      setCountValue(countMin)
      setCountInput(String(countMin))
      return
    }

    const parsed = Number(text)
    if (!Number.isFinite(parsed)) {
      setCountValue(countMin)
      setCountInput(String(countMin))
      return
    }

    const bounded = clamp(parsed, countMin, countMax)
    setCountValue(bounded)
    setCountInput(String(bounded))
  }

  function handleConfirmPurchase() {
    if (!canSubmit) return
    setConfirmOpen(true)
  }

  const orderStatus = createdOrder ? describeOrderStatus(createdOrder.order.status) : null
  const orderQuantityLabel = createdOrder
    ? createdOrder.order.countValue
      ? String(createdOrder.order.countValue)
      : selectedPackage?.label ?? '1'
    : ''
  const orderDate = createdOrder ? formatOrderDate(createdOrder.order.createdAt) : ''
  const orderTimeAgo = createdOrder ? formatRelativeTime(createdOrder.order.createdAt) : ''
  const latestAuditTime =
    createdOrder && createdOrder.audits.length > 0 ? createdOrder.audits[createdOrder.audits.length - 1]?.createdAt : createdOrder?.order.updatedAt
  const latestAuditTimeAgo = latestAuditTime ? formatRelativeTime(latestAuditTime) : ''

  const confirmDialog =
    confirmOpen && mounted
      ? createPortal(
          <div className='modal-overlay fixed inset-0 z-[150]'>
            <div className='desktop-modal-frame'>
            <div className='modal-surface desktop-modal-sheet w-full max-w-sm overflow-y-auto rounded-[24px] p-4 text-right shadow-[0_30px_80px_rgba(0,0,0,0.6)]'>
              <div className='space-y-2'>
                <h3 className='text-base font-black text-white'>تأكيد العملية</h3>
                <p className='text-sm leading-6 text-slate-300'>هل تريد تنفيذ هذا الطلب الآن؟</p>
              </div>

              <div className='mt-4 rounded-[18px] border border-white/10 bg-white/[0.04] p-3 text-sm'>
                <div className='flex items-start justify-between gap-3'>
                  <span className='text-slate-400'>المنتج</span>
                  <span className='font-semibold text-white'>{product.name}</span>
                </div>
                <div className='mt-2 flex items-start justify-between gap-3'>
                  <span className='text-slate-400'>{product.kind === 'count' ? 'الكمية' : 'الباقة'}</span>
                  <span className='font-semibold text-white'>
                    {product.kind === 'count'
                      ? pricingMode === 'price'
                        ? quantityFromPrice
                        : countValue
                      : selectedPackage?.label ?? '-'}
                  </span>
                </div>
                <div className='mt-2 flex items-start justify-between gap-3'>
                  <span className='text-slate-400'>معرف الحساب</span>
                  <span className='font-semibold text-white'>{account}</span>
                </div>
                <div className='mt-3 text-xs text-slate-400'>السعر الإجمالي</div>
                <div className='mt-1 text-lg font-black text-cyan-300'>${Number(total).toFixed(2)}</div>
              </div>

              <div className='mt-4 flex items-center gap-2'>
                <Button
                  className='h-11 flex-1 rounded-[16px] bg-[linear-gradient(180deg,rgba(34,211,238,1),rgba(8,145,178,1))] px-4 text-sm font-black text-slate-950 shadow-[0_14px_28px_rgba(34,211,238,0.28)] hover:brightness-105'
                  disabled={loading}
                  onClick={async () => {
                    setConfirmOpen(false)
                    await submitOrder()
                  }}
                >
                  {loading ? 'جاري التنفيذ...' : 'تأكيد'}
                </Button>
                <button
                  type='button'
                  className='inline-flex h-11 flex-1 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200'
                  onClick={() => setConfirmOpen(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
            </div>
          </div>,
          document.body
        )
      : null

  const orderDetailsDialog =
    orderDetailsOpen && mounted && createdOrder
      ? createPortal(
          <div className='modal-overlay fixed inset-0 z-[155]'>
            <div className='desktop-modal-frame'>
            <div className='modal-surface desktop-modal-sheet flex w-full max-w-md flex-col rounded-t-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,24,31,0.98),rgba(12,15,22,0.99))] p-0 text-right shadow-[0_30px_80px_rgba(0,0,0,0.6)] sm:rounded-[28px] lg:max-w-xl'>
              <div className='flex items-center justify-between border-b border-white/8 px-4 py-4 sm:px-5'>
                <div className='inline-flex items-center gap-2 text-slate-300'>
                  <button
                    type='button'
                    className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-lg leading-none transition hover:bg-white/[0.08]'
                    onClick={() => setOrderDetailsOpen(false)}
                    aria-label='إغلاق'
                  >
                    ×
                  </button>
                  <button
                    type='button'
                    className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm transition hover:bg-white/[0.08]'
                    aria-label='مشاركة'
                  >
                    ↗
                  </button>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='text-lg font-black text-white'>تفاصيل الطلب</div>
                  <div className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/18 bg-cyan-400/[0.12] text-cyan-200'>▣</div>
                </div>
              </div>

              <div className='flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5'>
                <div className='rounded-[22px] border border-white/8 bg-white/[0.03] px-3 py-4 sm:px-4'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2'>
                      <div
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-lg ${
                          orderStatus?.tone === 'success'
                            ? 'border-emerald-400/30 bg-emerald-500/12 text-emerald-300'
                            : orderStatus?.tone === 'danger'
                              ? 'border-rose-400/30 bg-rose-500/12 text-rose-300'
                              : 'border-cyan-300/28 bg-cyan-400/[0.12] text-cyan-200'
                        }`}
                      >
                        {orderStatus?.icon}
                      </div>
                      <div className='h-[3px] w-16 rounded-full bg-cyan-400/60' />
                    </div>
                    <div className='text-right'>
                      <div className={`text-sm font-black ${orderStatus?.accentClass}`}>{orderStatus?.label}</div>
                      <div className='mt-1 text-xs text-slate-400'>{orderStatus?.subLabel}</div>
                    </div>
                  </div>
                </div>

                <div className='rounded-[22px] border border-white/8 bg-white/[0.04] p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-start gap-3'>
                      {product.thumbnail ? (
                        <img
                          src={product.thumbnail}
                          alt={createdOrder.order.productName}
                          className='h-16 w-16 rounded-[18px] object-cover shadow-[0_10px_26px_rgba(0,0,0,0.28)]'
                        />
                      ) : null}
                      <div className='space-y-1 text-right'>
                        <div className='text-lg font-black text-white'>{createdOrder.order.productName}</div>
                        <div className='text-sm text-slate-400'>
                          {createdOrder.order.countValue ? `الكمية ${orderQuantityLabel}` : `الباقة ${orderQuantityLabel}`}
                        </div>
                      </div>
                    </div>
                    <div className='rounded-full border border-cyan-300/12 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold text-cyan-100'>
                      {createdOrder.order.fulfillMode === 'manual' ? 'تنفيذ يدوي' : 'تنفيذ مباشر'}
                    </div>
                  </div>

                  <div className='mt-5 space-y-3 text-sm'>
                    <DetailRow label='رقم الطلب' value={createdOrder.order._id ?? '-'} />
                    <DetailRow label='معرف الحساب' value={createdOrder.order.playerAccount} />
                    <DetailRow label='التاريخ' value={orderDate} helper={orderTimeAgo} />
                    <DetailRow label='السعر' value={`$${(createdOrder.order.totalPriceMinor / 100).toFixed(2)}`} />
                  </div>
                </div>

                <div
                  className={`rounded-[20px] border px-4 py-4 ${
                    orderStatus?.tone === 'success'
                      ? 'border-emerald-400/16 bg-emerald-500/[0.10]'
                      : orderStatus?.tone === 'danger'
                        ? 'border-rose-400/16 bg-rose-500/[0.10]'
                        : 'border-cyan-300/16 bg-cyan-400/[0.10]'
                  }`}
                >
                  <div className='flex items-center justify-between gap-3'>
                    <div className='text-right'>
                      <div className={`text-lg font-black ${orderStatus?.accentClass}`}>{orderStatus?.label}</div>
                      <div className='mt-1 text-sm text-slate-200'>
                        {createdOrder.audits.at(-1)?.message ?? orderStatus?.defaultMessage}
                      </div>
                      {latestAuditTimeAgo ? <div className='mt-1 text-xs text-slate-400'>{latestAuditTimeAgo}</div> : null}
                    </div>
                    <div
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-full border text-xl ${
                        orderStatus?.tone === 'success'
                          ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                          : orderStatus?.tone === 'danger'
                            ? 'border-rose-400/30 bg-rose-500/10 text-rose-300'
                            : 'border-cyan-300/30 bg-cyan-400/[0.10] text-cyan-200'
                      }`}
                    >
                      {orderStatus?.icon}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>,
          document.body
        )
      : null

  if (mobileStandalone) {
    return (
      <div className='popup-enter flex min-h-[52dvh] flex-col rounded-none border-0 bg-transparent px-0.5 py-3 shadow-none backdrop-blur-0'>
        <div className='space-y-3'>
          {recentAccounts.length > 0 && showRecentAccounts ? (
            <div className='rounded-[14px] border border-white/8 bg-white/[0.04] p-2.5 text-right'>
              <div className='mb-2 text-xs font-semibold text-slate-100'>معرفات حديثة</div>
              <div className='grid gap-1.5'>
                {recentAccounts.map((item) => (
                  <button
                    key={item}
                    type='button'
                    onClick={() => {
                      setAccount(item)
                      setShowRecentAccounts(false)
                    }}
                    className='rounded-[14px] border border-white/8 bg-white/[0.04] px-3 py-2 text-right text-[11px] text-slate-200'
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className='flex flex-row-reverse items-center gap-2'>
            <button
              type='button'
              onClick={() => setShowRecentAccounts((value) => !value)}
              className='inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-white/8 bg-white/[0.04] text-slate-200'
              aria-label='المعرفات السابقة'
            >
              <History className='h-4 w-4' />
            </button>
            <div className='amount-panel flex-1 p-1'>
              <Input placeholder='ادخل معرف الحساب' value={account} onChange={(event) => setAccount(event.target.value)} />
            </div>
          </div>

          {product.kind === 'package' ? (
            <div className='grid max-h-[320px] grid-cols-3 gap-2 overflow-y-auto pr-0.5'>
              {product.packages.map((pkg) => (
                <button
                  key={pkg.key}
                  disabled={!pkg.available}
                  type='button'
                  onClick={() => setPackageKey(pkg.key)}
                  className={`relative overflow-hidden rounded-[16px] border text-center transition ${
                    packageKey === pkg.key
                      ? 'border-cyan-300/75 bg-cyan-400/10 shadow-[0_10px_30px_rgba(34,211,238,0.16)]'
                      : 'border-white/8 bg-white/[0.04]'
                  } ${pkg.available ? 'hover:border-cyan-300/45' : 'cursor-not-allowed opacity-45'}`}
                >
                  <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(3,9,20,0.12),rgba(3,9,20,0.82))]' />
                  {product.thumbnail ? (
                    <img
                      src={product.thumbnail}
                      alt={pkg.label}
                      className='absolute inset-0 h-full w-full object-cover opacity-40'
                    />
                  ) : null}
                  <div className='relative z-10 flex aspect-[0.92] flex-col justify-between p-2'>
                    <div className='flex items-start justify-between gap-1'>
                      <span className='rounded-full bg-black/35 px-1.5 py-0.5 text-[9px] font-bold text-amber-300'>
                        فوري
                      </span>
                      {packageKey === pkg.key ? (
                        <span className='inline-flex h-4 w-4 items-center justify-center rounded-full bg-cyan-300 text-[10px] font-black text-slate-950'>
                          ✓
                        </span>
                      ) : null}
                    </div>
                    <div className='space-y-1'>
                      <div className='line-clamp-2 text-[12px] font-black leading-4 text-white'>{pkg.label}</div>
                      <div className='text-[13px] font-black text-amber-300'>${pkg.finalPrice.toFixed(2)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {product.kind === 'count' && product.count ? (
            <div className='space-y-2.5'>
              <div className='grid grid-cols-2 gap-2'>
                <button
                  type='button'
                  onClick={() => {
                    setPricingMode('quantity')
                    setCountInput(String(countValue))
                  }}
                  className={`rounded-[14px] px-2.5 py-2.5 text-center text-[12px] ${
                    pricingMode === 'quantity'
                      ? 'border border-cyan-300/50 bg-cyan-400/12 font-semibold text-cyan-100'
                      : 'border border-white/10 bg-white/[0.03] text-slate-300'
                  }`}
                >
                  حسب الكمية
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setPricingMode('price')
                    setCountInput(String(Number(countTotal || total).toFixed(2)))
                  }}
                  className={`rounded-[14px] px-2.5 py-2.5 text-center text-[12px] ${
                    pricingMode === 'price'
                      ? 'border border-cyan-300/50 bg-cyan-400/12 font-semibold text-cyan-100'
                      : 'border border-white/10 bg-white/[0.03] text-slate-300'
                  }`}
                >
                  حسب السعر
                </button>
              </div>

              <div className='text-right text-[12px] text-slate-200'>
                {pricingMode === 'quantity' ? `الكمية (${countMin} - ${countMax})` : 'السعر (USD)'}
              </div>
              <Input
                type='number'
                min={pricingMode === 'quantity' ? countMin : 0}
                max={pricingMode === 'quantity' ? countMax : undefined}
                step={pricingMode === 'quantity' ? countStep : '0.01'}
                value={countInput}
                onChange={(event) => {
                  const nextText = event.target.value
                  setCountInput(nextText)
                  if (nextText === '') return
                  const parsed = Number(nextText)
                  if (!Number.isFinite(parsed)) return
                  if (pricingMode === 'quantity') {
                    setCountValue(clamp(parsed, countMin, countMax))
                  }
                }}
                onBlur={() => {
                  if (pricingMode === 'quantity') {
                    commitCountInput()
                    return
                  }

                  const parsed = Number(countInput)
                  if (!Number.isFinite(parsed) || parsed < 0) {
                    setCountInput('0')
                  }
                }}
              />
              <div className='text-right text-[12px] text-slate-300'>
                {pricingMode === 'quantity'
                  ? `السعر ${Number(total).toFixed(6)}$`
                  : `الكمية ${quantityFromPrice}`}
              </div>
            </div>
          ) : null}
        </div>

        <div className='mt-auto flex items-center gap-2 border-t border-white/10 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4'>
          <button
            type='button'
            className='inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-cyan-300/15 bg-cyan-400/[0.08] text-cyan-100 transition hover:bg-cyan-400/[0.14]'
            aria-label='مشاركة'
          >
            ↗
          </button>
          <Button
            className='product-primary-cta h-12 flex-1 rounded-[16px] bg-[linear-gradient(180deg,rgba(34,211,238,1),rgba(8,145,178,1))] px-4 text-sm font-black text-slate-950 shadow-[0_14px_28px_rgba(34,211,238,0.28)] hover:brightness-105'
            disabled={!canSubmit}
            onClick={handleConfirmPurchase}
          >
            {loading ? 'جاري التنفيذ...' : 'اشتري الآن'}
          </Button>
        </div>

        {message ? <p className='pt-2 text-center text-sm text-cyan-200'>{message}</p> : null}
        {confirmDialog}
        {orderDetailsDialog}
      </div>
    )
  }

  return (
    <div className='product-popup-shell card-shell modal-surface popup-enter space-y-2.5 overflow-hidden rounded-[22px] p-2.5 sm:space-y-4 sm:rounded-[24px] sm:p-5 lg:sticky lg:top-28 lg:space-y-4 lg:rounded-[26px] lg:p-5 xl:p-6'>
      <div className='modal-header space-y-1.5 pb-2.5 sm:space-y-2 sm:pb-4'>
        <div className='flex items-center justify-between gap-3'>
          <h3 className='text-sm font-black sm:text-lg'>تأكيد الشراء</h3>
          <span className='rounded-full border border-emerald-400/18 bg-emerald-500/10 px-2 py-1 text-[9px] font-semibold text-emerald-300 sm:px-3 sm:text-[11px]'>
            شحن موثوق
          </span>
        </div>
        <p className='text-[10px] leading-4.5 text-slate-400 sm:text-xs sm:leading-6'>
          تعبئة سريعة وآمنة عبر نظام Bily Card مع تأكيد مباشر للسعر قبل تنفيذ الطلب.
        </p>
      </div>

      {product.kind === 'package' ? (
        <div className='product-selector-grid modal-body form-section grid max-h-[132px] grid-cols-1 overflow-y-auto pr-0.5 sm:max-h-none sm:overflow-visible lg:grid-cols-2 lg:gap-2.5'>
          {product.packages.map((pkg) => (
            <button
              key={pkg.key}
              disabled={!pkg.available}
              type='button'
              onClick={() => setPackageKey(pkg.key)}
              className={`product-selector-card detail-row rounded-[18px] p-2 text-right sm:rounded-2xl sm:p-3 ${
                packageKey === pkg.key
                  ? 'product-selector-card-active border-cyan-300/60 bg-cyan-400/12 shadow-[0_10px_24px_rgba(34,211,238,0.16)]'
                  : 'border-cyan-500/20 bg-panel'
              } ${pkg.available ? 'hover:border-cyan-300/60' : 'cursor-not-allowed opacity-50'}`}
            >
              <div className='text-xs font-medium sm:text-sm'>{pkg.label}</div>
              <div className='text-xs font-bold text-cyan-300 sm:text-sm'>${pkg.finalPrice.toFixed(2)}</div>
              {!pkg.available ? <div className='mt-1 text-xs text-rose-300'>نفد المخزون</div> : null}
            </button>
          ))}
        </div>
      ) : null}

      {product.kind === 'count' && product.count ? (
        <div className='product-popup-block modal-body form-section space-y-2 p-3 lg:space-y-3'>
          <div className='grid grid-cols-2 gap-2'>
            <div className='product-selector-card rounded-[18px] px-2.5 py-2 text-center text-[11px] text-slate-300 sm:rounded-2xl sm:px-3 sm:text-sm'>
              حسب الكمية
            </div>
            <div className='product-selector-card product-selector-card-active rounded-[18px] border-cyan-300/50 bg-cyan-400/12 px-2.5 py-2 text-center text-[11px] font-semibold text-cyan-100 sm:rounded-2xl sm:px-3 sm:text-sm'>
              حسب السعر
            </div>
          </div>

          <div className='flex items-center justify-between text-[10px] text-slate-400 sm:text-[11px]'>
            <span>السعر (USD)</span>
            <span>الكمية: {countValue}</span>
          </div>
          <Input
            type='number'
            min={countMin}
            max={countMax}
            step={countStep}
            value={countInput}
            onChange={(event) => {
              const nextText = event.target.value
              setCountInput(nextText)
              if (nextText === '') return
              const parsed = Number(nextText)
              if (!Number.isFinite(parsed)) return
              setCountValue(clamp(parsed, countMin, countMax))
            }}
            onBlur={() => commitCountInput()}
          />
          <div className='flex justify-end text-[11px] text-slate-300'>السعر {Number(total).toFixed(6)}$</div>
        </div>
      ) : null}

      <div className='product-popup-block product-input-group modal-body form-section space-y-1 p-3 lg:space-y-2'>
        <label className='text-[10px] text-slate-400 sm:text-xs'>معرّف الحساب</label>
        <div className='amount-panel p-1'>
          <Input placeholder='ادخل معرف الحساب' value={account} onChange={(event) => setAccount(event.target.value)} />
        </div>
      </div>

      <div className='product-summary-card summary-panel space-y-1.5 p-2.5 sm:p-3 lg:space-y-2 lg:p-4'>
        <div className='flex items-start justify-between gap-3 text-[11px] sm:text-sm'>
          <span className='text-slate-400'>المنتج</span>
          <span className='font-semibold text-white'>{product.name}</span>
        </div>
        <div className='flex items-start justify-between gap-3 text-[11px] sm:text-sm'>
          <span className='text-slate-400'>{product.kind === 'count' ? 'الكمية' : 'الباقة'}</span>
          <span className='font-semibold text-white'>{product.kind === 'count' ? countValue : selectedPackage?.label ?? '-'}</span>
        </div>
        <div className='flex items-start justify-between gap-3 text-[11px] sm:text-sm'>
          <span className='text-slate-400'>معرف الحساب</span>
          <span className='font-semibold text-white'>{account || 'غير مدخل بعد'}</span>
        </div>
        <div className='card-divider' />
        <div className='text-[11px] text-slate-400 sm:text-xs'>السعر الإجمالي</div>
        <div className='text-lg font-black text-cyan-300 sm:text-2xl'>${Number(total).toFixed(2)}</div>
      </div>

      <div className='product-cta-strip modal-footer flex items-center gap-2 pt-2.5 sm:pt-4'>
        <button
          type='button'
          className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-cyan-300/15 bg-cyan-400/[0.08] text-cyan-100 transition hover:bg-cyan-400/[0.14] sm:h-12 sm:w-12 sm:rounded-2xl'
          aria-label='مشاركة'
        >
          ↗
        </button>
        <Button
          className='product-primary-cta h-11 flex-1 rounded-[18px] bg-[linear-gradient(180deg,rgba(34,211,238,1),rgba(8,145,178,1))] px-4 text-sm font-black text-slate-950 shadow-[0_14px_28px_rgba(34,211,238,0.28)] hover:brightness-105 sm:h-12 sm:rounded-2xl'
          disabled={!canSubmit}
          onClick={handleConfirmPurchase}
        >
          {loading ? 'جاري التنفيذ...' : 'شراء الآن'}
        </Button>
      </div>

      <div className='-mt-1 hidden items-center justify-between text-[11px] text-slate-500 sm:flex'>
        <span>تنفيذ آمن</span>
        <span>دعم Bily Card</span>
      </div>
      {message ? <p className='text-center text-sm text-cyan-200'>{message}</p> : null}
      {confirmDialog}
    </div>
  )
}

function DetailRow({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className='flex items-start justify-between gap-3'>
      <div className='text-right'>
        <div className='font-semibold text-white'>{value}</div>
        {helper ? <div className='mt-0.5 text-xs text-slate-400'>{helper}</div> : null}
      </div>
      <div className='text-slate-400'>{label}</div>
    </div>
  )
}

function describeOrderStatus(status: string) {
  const value = status.toLowerCase()

  if (value.includes('complete')) {
    return {
      label: 'مكتمل',
      subLabel: 'تم التنفيذ بنجاح',
      defaultMessage: 'تم تنفيذ الطلب بنجاح.',
      tone: 'success' as const,
      icon: '✓',
      accentClass: 'text-emerald-300',
    }
  }

  if (value.includes('fail') || value.includes('refund') || value.includes('cancel')) {
    return {
      label: 'ملغي',
      subLabel: 'تم إيقاف أو إرجاع الطلب',
      defaultMessage: 'تم إلغاء الطلب أو إرجاعه.',
      tone: 'danger' as const,
      icon: '×',
      accentClass: 'text-rose-300',
    }
  }

  return {
    label: value.includes('manual') ? 'بانتظار المعالجة' : 'قيد المعالجة',
    subLabel: value.includes('manual') ? 'تم تحويله للمتابعة اليدوية' : 'يتم تنفيذ الطلب الآن',
    defaultMessage: 'طلبك قيد التنفيذ الآن.',
    tone: 'info' as const,
    icon: '◔',
    accentClass: 'text-cyan-200',
  }
}

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatRelativeTime(value: string) {
  const diffMs = new Date(value).getTime() - Date.now()
  const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })
  const minutes = Math.round(diffMs / (1000 * 60))
  const hours = Math.round(diffMs / (1000 * 60 * 60))
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(days, 'day')
}
function clamp(value: number, min: number, max: number) {
  if (value < min) return min
  if (value > max) return max
  return value
}
