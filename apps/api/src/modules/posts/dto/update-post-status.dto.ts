import { IsEnum } from 'class-validator'
import { PostStatus } from '@/generated/prisma/client'

export class UpdatePostStatusDto {
  @IsEnum({ APPROVED: PostStatus.APPROVED, REJECTED: PostStatus.REJECTED })
  status: PostStatus.APPROVED | PostStatus.REJECTED
}
