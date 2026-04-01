'use client'

import { useState } from 'react'
import { fromMinor, toMinor } from '@/core/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type WalletData = {
  balanceMinor: number
  transactions: Array<{
    _id: string
    type: string
    amountMinor: number
    balanceAfterMinor: number
    note: string
    createdAt: string
  }>
}

type DepositData = Array<{
  _id: string
  amountMinor: number
  status: 'pending' | 'approved' | 'rejected'
  receiptUrl: string
  adminNote?: string
  createdAt: string
}>

type DepositMethod = {
  _id: string
  key: string
  name: string
  type: 'crypto' | 'mobile' | 'bank' | 'cash'
  network: string
  currency: string
  address: string
  accountNumber: string
  phone: string
  holderName: string
  iconUrl: string
  instructions: string
  processingTimeText: string
  requiresReceipt: boolean
  minAmount: number | null
  maxAmount: number | null
  feePercent: number
  feeFixed: number
}

export function WalletClient({
  initialWallet,
  initialDeposits,
  initialMethods,
}: {
  initialWallet: WalletData
  initialDeposits: DepositData
  initialMethods: DepositMethod[]
}) {
  const [wallet, setWallet] = useState(initialWallet)
  const [deposits, setDeposits] = useState(initialDeposits)
  const [methods, setMethods] = useState(initialMethods)
  const [amount, setAmount] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedMethodKey, setSelectedMethodKey] = useState(initialMethods[0]?.key ?? '')

  const selectedMethod = methods.find((method) => method.key === selectedMethodKey) ?? methods[0] ?? null
  const amountValue = Number(amount || '0')
  const feeValue = selectedMethod ? amountValue * (selectedMethod.feePercent / 100) + selectedMethod.feeFixed : 0
  const finalAmount = Math.max(0, amountValue - feeValue)

  async function refresh() {
    const [walletRes, depositsRes, methodsRes] = await Promise.all([
      fetch('/api/wallet', { cache: 'no-store' }),
      fetch('/api/wallet/deposits', { cache: 'no-store' }),
      fetch('/api/wallet/deposit-methods', { cache: 'no-store' }),
    ])

    const walletJson = await walletRes.json()
    const depositsJson = await depositsRes.json()
    const methodsJson = await methodsRes.json()

    setWallet(walletJson.data)
    setDeposits(depositsJson.data)
    setMethods(methodsJson.data ?? [])
    setSelectedMethodKey((current) => current || methodsJson.data?.[0]?.key || '')
  }

  async function submitDeposit() {
    setLoading(true)
    setStatus('')

    const amountMinor = toMinor(Number(amount || '0'))
    const res = await fetch('/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountMinor, receiptUrl }),
    })

    setLoading(false)

    if (!res.ok) {
      setStatus('فشل إرسال طلب الإيداع')
      return
    }

    setAmount('')
    setReceiptUrl('')
    setStatus('تم إرسال طلب الإيداع')
    await refresh()
  }

  return (
    <section className='wallet-shell space-y-4'>
      <h1 className='text-2xl font-bold'>المحفظة</h1>

      <div className='wallet-stat-grid'>
        <div className='wallet-stat-card p-4'>
          <div className='text-sm text-slate-400'>الرصيد الحالي</div>
          <div className='text-3xl font-extrabold text-cyan-300'>${fromMinor(wallet.balanceMinor).toFixed(2)}</div>
        </div>
        <div className='wallet-stat-card p-4'>
          <div className='text-sm text-slate-400'>طلبات الإيداع</div>
          <div className='text-3xl font-extrabold text-cyan-300'>{deposits.length}</div>
        </div>
        <div className='wallet-stat-card p-4'>
          <div className='text-sm text-slate-400'>المعاملات</div>
          <div className='text-3xl font-extrabold text-cyan-300'>{wallet.transactions.length}</div>
        </div>
      </div>

      <div className='payment-form-shell space-y-2 p-4'>
        <h2 className='font-semibold'>طلب إيداع جديد</h2>

        {methods.length > 0 ? (
          <>
            <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-3'>
              {methods.map((method) => (
                <button
                  key={method._id}
                  type='button'
                  onClick={() => setSelectedMethodKey(method.key)}
                  className={`rounded-2xl border p-3 text-right transition ${
                    selectedMethod?.key === method.key
                      ? 'border-cyan-300/45 bg-cyan-400/[0.08]'
                      : 'border-cyan-400/15 bg-white/[0.02] hover:border-cyan-300/22'
                  }`}
                >
                  <div className='flex items-start gap-3'>
                    {method.iconUrl ? <img src={method.iconUrl} alt={method.name} className='h-10 w-10 rounded-xl object-cover' /> : null}
                    <div className='min-w-0'>
                      <div className='font-semibold text-white'>{method.name}</div>
                      <div className='text-xs text-slate-400'>
                        {method.network ? `${method.network} · ` : ''}
                        {method.currency}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedMethod ? (
              <div className='transaction-row space-y-3 p-4'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <div className='text-lg font-bold text-white'>{selectedMethod.name}</div>
                    {selectedMethod.network ? <div className='text-xs text-slate-400'>{selectedMethod.network}</div> : null}
                  </div>
                  {selectedMethod.processingTimeText ? (
                    <span className='rounded-full bg-cyan-400/[0.08] px-3 py-1 text-xs text-cyan-200'>
                      {selectedMethod.processingTimeText}
                    </span>
                  ) : null}
                </div>

                {selectedMethod.address ? <InfoRow label='العنوان' value={selectedMethod.address} /> : null}
                {selectedMethod.phone ? <InfoRow label='الهاتف' value={selectedMethod.phone} /> : null}
                {selectedMethod.accountNumber ? <InfoRow label='رقم الحساب' value={selectedMethod.accountNumber} /> : null}
                {selectedMethod.holderName ? <InfoRow label='اسم المستفيد' value={selectedMethod.holderName} /> : null}
                {selectedMethod.instructions ? <p className='text-sm leading-6 text-slate-300'>{selectedMethod.instructions}</p> : null}

                <div className='form-section grid gap-2 sm:grid-cols-2'>
                  <div className='amount-panel p-1.5'>
                    <Input type='number' step='0.01' value={amount} onChange={(e) => setAmount(e.target.value)} placeholder='Amount' />
                  </div>
                  {selectedMethod.requiresReceipt ? (
                    <div className='upload-shell p-1.5'>
                      <Input value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} placeholder='Receipt URL (optional)' />
                    </div>
                  ) : null}
                </div>

                <div className='grid gap-2 text-sm text-slate-300 sm:grid-cols-3'>
                  <div className='rounded-xl bg-white/[0.03] p-3'>العملة: {selectedMethod.currency}</div>
                  <div className='rounded-xl bg-white/[0.03] p-3'>الرسوم: ${feeValue.toFixed(2)}</div>
                  <div className='rounded-xl bg-white/[0.03] p-3'>الصافي بعد الرسوم: ${finalAmount.toFixed(2)}</div>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className='form-section grid gap-2 sm:grid-cols-2'>
            <div className='amount-panel p-1.5'>
              <Input type='number' step='0.01' value={amount} onChange={(e) => setAmount(e.target.value)} placeholder='Amount' />
            </div>
            <div className='upload-shell p-1.5'>
              <Input value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} placeholder='Receipt URL (optional)' />
            </div>
          </div>
        )}

        <Button onClick={submitDeposit} disabled={loading || !amount}>
          {loading ? '...' : 'إرسال الطلب'}
        </Button>
        {status ? <p className='text-sm text-cyan-300'>{status}</p> : null}
      </div>

      <div className='transaction-panel p-4'>
        <h2 className='mb-2 font-semibold'>طلبات الإيداع</h2>
        <div className='space-y-2'>
          {deposits.map((d) => (
            <div key={d._id} className='transaction-row p-3 text-sm'>
              <div>${fromMinor(d.amountMinor).toFixed(2)}</div>
              <div className='text-xs text-slate-400'>status: {d.status}</div>
              {d.adminNote ? <div className='text-xs text-rose-300'>{d.adminNote}</div> : null}
            </div>
          ))}
        </div>
      </div>

      <div className='transaction-panel p-4'>
        <h2 className='mb-2 font-semibold'>المعاملات</h2>
        <div className='space-y-2'>
          {wallet.transactions.map((tx) => (
            <div key={tx._id} className='transaction-row p-3 text-sm'>
              <div className='font-semibold'>{tx.type}</div>
              <div>{fromMinor(tx.amountMinor).toFixed(2)}$</div>
              <div className='text-xs text-slate-400'>{formatStableDateTime(tx.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl bg-white/[0.03] p-3 text-sm'>
      <div className='mb-1 text-xs text-slate-400'>{label}</div>
      <div className='break-all text-slate-100'>{value}</div>
    </div>
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
