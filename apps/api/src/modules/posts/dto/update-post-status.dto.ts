import { IsEnum } from 'class-validator'
import { PostStatus } from '@/generated/prisma/client'

const ACTIONABLE_STATUSES = [PostStatus.APPROVED, PostStatus.REJECTED] as const

export class UpdatePostStatusDto {
  @IsEnum(PostStatus)
  status: (typeof ACTIONABLE_STATUSES)[number]
}
