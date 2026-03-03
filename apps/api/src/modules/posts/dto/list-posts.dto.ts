import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { PostStatus, PostType } from '@/generated/prisma/client'
import { PaginationDto } from '@/common/dto/pagination.dto'

export class ListPostsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string

  @ApiPropertyOptional({ enum: PostType, enumName: 'PostType' })
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType

  @ApiPropertyOptional({ enum: PostStatus, enumName: 'PostStatus' })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorId?: string
}
