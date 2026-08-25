import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional, IsString } from 'class-validator'
import { PaginationDto } from '@/common/dto/pagination.dto'

export class ListCoursesDto extends PaginationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentId?: string

  @ApiProperty({ required: false, description: 'Only return courses with a saved module outline' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasOutline?: boolean
}
