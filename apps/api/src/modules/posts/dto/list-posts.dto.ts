import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { PostStatus, PostType } from '@/generated/prisma/client'
import { PaginationDto } from '@/common/dto/pagination.dto'

export class ListPostsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string

  @ApiPropertyOptional({ minimum: 1, maximum: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  yearLevel?: number

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
  authorId?: string
}
