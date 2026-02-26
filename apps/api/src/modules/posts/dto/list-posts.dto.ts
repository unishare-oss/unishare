import { IsEnum, IsOptional, IsString } from 'class-validator'
import { PostStatus, PostType } from '@/generated/prisma/client'
import { PaginationDto } from '@/common/dto/pagination.dto'

export class ListPostsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  courseId?: string

  @IsOptional()
  @IsEnum(PostType)
  type?: PostType

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus
}
