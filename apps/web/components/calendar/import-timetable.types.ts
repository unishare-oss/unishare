import type { ExamImportRowEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

export type ReviewRow = ExamImportRowEntity & { rowId: number }
