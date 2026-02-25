// Roles & Statuses
export const UserRole = {
  Student: 'STUDENT',
  Moderator: 'MODERATOR',
  Admin: 'ADMIN',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const FileCategory = {
  Notes: 'NOTES',
  PastPaper: 'PAST_PAPER',
  Slides: 'SLIDES',
  Assignment: 'ASSIGNMENT',
  Other: 'OTHER',
} as const
export type FileCategory = (typeof FileCategory)[keyof typeof FileCategory]

export const FileStatus = {
  Pending: 'PENDING',
  Approved: 'APPROVED',
  Rejected: 'REJECTED',
} as const
export type FileStatus = (typeof FileStatus)[keyof typeof FileStatus]

// Constants
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export const SUPPORTED_FILE_TYPES = ['pdf', 'docx', 'pptx', 'xlsx', 'png', 'jpg'] as const

export const PAGINATION_DEFAULT_LIMIT = 20

export const PAGINATION_MAX_LIMIT = 100

// Utility types
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
