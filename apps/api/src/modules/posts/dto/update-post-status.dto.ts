import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'
import { PostStatus } from '@/generated/prisma/enums'

export class UpdatePostStatusDto {
  @ApiProperty({
    enum: [PostStatus.APPROVED, PostStatus.REJECTED],
    enumName: 'UpdateablePostStatus',
  })
  @IsEnum({ APPROVED: PostStatus.APPROVED, REJECTED: PostStatus.REJECTED })
  status: Exclude<PostStatus, 'PENDING'>
}
