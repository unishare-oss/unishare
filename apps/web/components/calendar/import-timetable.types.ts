import type { ExamImportRowEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

export type ReviewRow = Omit<ExamImportRowEntity, 'matchStatus'> & {
  rowId: number
  matchStatus: ExamImportRowEntity['matchStatus'] | 'picked'
}
