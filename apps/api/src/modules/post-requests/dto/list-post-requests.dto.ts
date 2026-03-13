import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { PostRequestStatus } from '@/generated/prisma/enums'
import { PaginationDto } from '@/common/dto/pagination.dto'

export class ListPostRequestsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string

  @ApiPropertyOptional({ enum: PostRequestStatus })
  @IsOptional()
  @IsEnum(PostRequestStatus)
  status?: PostRequestStatus
}
