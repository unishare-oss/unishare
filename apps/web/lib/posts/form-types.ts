import type { PostType as _GeneratedPostType } from '@/src/lib/api/generated/unishareAPI.schemas'

export type PostType = `${_GeneratedPostType}`

export type CreatePostFormValues = {
  postType: PostType | null
  selectedDept: string
  selectedCourse: string
  title: string
  description: string
  isAnonymous: boolean
  year: string
  semester: string
  moduleNum: string
  examYear: string
  externalUrl?: string
  files: File[]
  tags: string[]
}
