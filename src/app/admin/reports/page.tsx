export const dynamic = 'force-dynamic'

import { buildReports } from '@/features/admin/reports.service'
import { AdminReportsDashboard } from '@/components/admin/admin-reports-dashboard'

export default async function AdminReportsPage() {
  const initial = await buildReports('today')
  return <AdminReportsDashboard initial={initial as any} />
}
