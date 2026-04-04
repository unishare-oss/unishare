import { IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { PaginationDto } from '@/common/dto/pagination.dto'

export class ListQuizzesDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string
}
