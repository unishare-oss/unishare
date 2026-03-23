'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useAdminReportsControllerListReports,
  useAdminReportsControllerApproveReport,
  useAdminReportsControllerRejectReport,
  getAdminReportsControllerListReportsQueryKey,
} from '@/src/lib/api/generated/admin/admin'
import { AdminReportsControllerListReportsStatus } from '@/src/lib/api/generated/unishareAPI.schemas'
import { EmptyState } from '@/components/shared/empty-state'
import { ReportsHeader, type ReportStatusFilter } from '@/components/admin/reports/reports-header'
import { ReportRow } from '@/components/admin/reports/report-row'

export default function ReportsPage() {
  const [activeFilter, setActiveFilter] = useState<ReportStatusFilter>('PENDING')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const pendingParams = { status: AdminReportsControllerListReportsStatus.PENDING, limit: 1 }
  const listParams = { status: activeFilter as AdminReportsControllerListReportsStatus, limit: 50 }

  const { data: listData } = useAdminReportsControllerListReports(listParams, {
    query: { select: (r) => r.data },
  })

  const { data: pendingData } = useAdminReportsControllerListReports(pendingParams, {
    query: { select: (r) => r.data },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getAdminReportsControllerListReportsQueryKey() })
    setExpandedId(null)
  }

  const { mutate: approve, isPending: approving } = useAdminReportsControllerApproveReport({
    mutation: { onSuccess: invalidate },
  })

  const { mutate: reject, isPending: rejecting } = useAdminReportsControllerRejectReport({
    mutation: { onSuccess: invalidate },
  })

  const reports = listData?.reports ?? []
  const pendingCount = pendingData?.total ?? 0
  const isActioning = approving || rejecting

  return (
    <div className="flex flex-col min-h-screen">
      <ReportsHeader
        pendingCount={pendingCount}
        activeFilter={activeFilter}
        onFilterChange={(f) => {
          setActiveFilter(f)
          setExpandedId(null)
        }}
      />

      <div className="flex-1 bg-card">
        {reports.length === 0 ? (
          <EmptyState message={`No ${activeFilter.toLowerCase()} reports.`} />
        ) : (
          reports.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              expanded={expandedId === report.id}
              onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
              onApprove={() => approve({ id: report.id })}
              onReject={() => reject({ id: report.id })}
              isActioning={isActioning}
            />
          ))
        )}
      </div>
    </div>
  )
}
