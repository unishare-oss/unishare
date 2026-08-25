import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateExamDto {
  @ApiProperty()
  @IsString()
  courseId: string

  @ApiProperty({ minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title: string

  @ApiProperty()
  @IsDateString()
  startsAt: string

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsDateString()
  endsAt?: string | null

  @ApiPropertyOptional({ nullable: true, type: String, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  examRoom?: string | null

  @ApiPropertyOptional({ nullable: true, type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null
}
