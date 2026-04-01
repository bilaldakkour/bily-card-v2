'use client'

import { useMemo, useState } from 'react'
import { fromMinor } from '@/core/money'
import { AdminPageShell, AdminStatCard, AdminStatGrid } from '@/components/admin/admin-page-shell'
import { Button } from '@/components/ui/button'

type AdminUser = {
  _id: string
  name: string
  email: string
  role: 'customer' | 'admin'
  isActive: boolean
  walletBalanceMinor: number
  createdAt: string
  updatedAt?: string
}

export function AdminUsersManager({ initial, currentAdminId }: { initial: AdminUser[]; currentAdminId: string }) {
  const [items, setItems] = useState<AdminUser[]>(initial)
  const [message, setMessage] = useState('')
  const [savingId, setSavingId] = useState('')
  const [dirtyIds, setDirtyIds] = useState<string[]>([])

  const stats = useMemo(() => {
    const admins = items.filter((item) => item.role === 'admin').length
    const active = items.filter((item) => item.isActive).length
    return { total: items.length, admins, active }
  }, [items])

  async function updateRow(userId: string, patch: Partial<Pick<AdminUser, 'role' | 'isActive'>>) {
    setSavingId(userId)
    setMessage('')

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).finally(() => setSavingId(''))

    const json = await res.json()

    if (!res.ok) {
      setMessage(json?.error?.message ?? 'Failed to update user')
      return
    }

    const updated = json.data as AdminUser
    setItems((prev) => prev.map((item) => (item._id === userId ? { ...item, ...updated } : item)))
    setDirtyIds((prev) => prev.filter((id) => id !== userId))
    setMessage('User updated successfully')
  }

  return (
    <AdminPageShell title='المستخدمون' description='إدارة الدور والتفعيل بشكل مباشر وآمن بدون تعقيد.'>

      <AdminStatGrid>
        <AdminStatCard label='Filtered Users' value={String(stats.total)} />
        <AdminStatCard label='Admins' value={String(stats.admins)} />
        <AdminStatCard label='Active Users' value={String(stats.active)} tone='emerald' />
      </AdminStatGrid>

      <div className='admin-table-shell card-shell p-0'>
        {message ? (
          <p className='admin-message-bar px-3 py-2 text-sm sm:px-4'>{message}</p>
        ) : null}
        <div className='admin-table-wrap'>
        <table className='admin-table min-w-full text-right text-sm'>
          <thead>
            <tr>
              <th className='admin-table-cell-compact'>Name</th>
              <th className='admin-table-cell-compact'>Email</th>
              <th className='admin-table-cell-compact'>Role</th>
              <th className='admin-table-cell-compact'>Status</th>
              <th className='admin-table-cell-compact'>Wallet</th>
              <th className='admin-table-cell-compact'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className='admin-table-cell py-8 text-center text-slate-400'>
                  لا يوجد مستخدمون ضمن هذا الفلتر.
                </td>
              </tr>
            ) : null}

            {items.map((user) => {
              const isSelf = user._id === currentAdminId
              const isSaving = savingId === user._id
              const isDirty = dirtyIds.includes(user._id)
              return (
                <tr
                  key={user._id}
                  className={`admin-table-row align-top ${
                    isSaving ? 'bg-cyan-500/10' : isDirty ? 'bg-amber-400/5' : ''
                  }`}
                >
                  <td className='admin-table-cell'>
                    <div className='admin-split-stat'>
                      <div className='admin-table-main'>{user.name}</div>
                      <div className='admin-table-sub'>{formatStableDate(user.createdAt)}</div>
                    </div>
                  </td>
                  <td className='admin-table-cell text-xs text-slate-200'>
                    <span className='break-all'>{user.email}</span>
                  </td>
                  <td className='admin-table-cell'>
                    <select
                      className='input-shell h-9 min-w-[110px] text-xs sm:min-w-[120px] sm:text-sm'
                      value={user.role}
                      disabled={isSaving || isSelf}
                      onChange={(event) => {
                        const role = event.target.value as 'customer' | 'admin'
                        setDirtyIds((prev) => (prev.includes(user._id) ? prev : [...prev, user._id]))
                        setItems((prev) => prev.map((item) => (item._id === user._id ? { ...item, role } : item)))
                      }}
                    >
                      <option value='customer'>customer</option>
                      <option value='admin'>admin</option>
                    </select>
                  </td>
                  <td className='admin-table-cell'>
                    <label className='inline-flex items-center gap-2 text-xs'>
                      <input
                        type='checkbox'
                        checked={user.isActive}
                        disabled={isSaving || isSelf}
                        onChange={(event) => {
                          const isActive = event.target.checked
                          setDirtyIds((prev) => (prev.includes(user._id) ? prev : [...prev, user._id]))
                          setItems((prev) => prev.map((item) => (item._id === user._id ? { ...item, isActive } : item)))
                        }}
                      />
                      <span className={`status-chip ${user.isActive ? 'status-chip-success' : 'status-chip-danger'}`}>
                        {user.isActive ? 'active' : 'inactive'}
                      </span>
                    </label>
                  </td>
                  <td className='admin-table-cell whitespace-nowrap'>${fromMinor(user.walletBalanceMinor ?? 0).toFixed(2)}</td>
                  <td className='admin-table-cell'>
                    <Button
                      variant='secondary'
                      disabled={isSaving || isSelf}
                      onClick={() => updateRow(user._id, { role: user.role, isActive: user.isActive })}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    {isDirty && !isSaving ? <div className='mt-1 text-[11px] text-amber-300'>Unsaved changes</div> : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      <p className='text-xs text-slate-400'>ملاحظة: لا يمكن للأدمن تعطيل حسابه أو إزالة صلاحية نفسه.</p>
    </AdminPageShell>
  )
}

function formatStableDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'Asia/Beirut',
  }).format(new Date(value))
}
