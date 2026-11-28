export const EXAM_BULK_SKIP_REASONS = ['existing', 'duplicate_in_request'] as const

export type ExamBulkSkipReason = (typeof EXAM_BULK_SKIP_REASONS)[number]
