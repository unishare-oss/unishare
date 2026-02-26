import { IsEnum } from 'class-validator'
import { PostStatus } from '@/generated/prisma/enums'

export class UpdatePostStatusDto {
  @IsEnum({ APPROVED: PostStatus.APPROVED, REJECTED: PostStatus.REJECTED })
  status: Exclude<PostStatus, 'PENDING'>
}
