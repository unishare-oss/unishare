import type { PostType } from './type-step'

export type CreatePostFormValues = {
  postType: PostType | null
  selectedDept: string
  selectedCourse: string
  title: string
  description: string
  year: string
  semester: string
  moduleNum: string
  examYear: string
  externalUrl?: string
  files: File[]
}
