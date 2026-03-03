import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PostType } from '@/generated/prisma/client'

export class CreatePostDto {
  @ApiProperty({ enum: PostType })
  @IsEnum(PostType)
  type: PostType

  @ApiProperty()
  @IsString()
  courseId: string

  @ApiProperty({ minLength: 3, maxLength: 200 })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  description: string

  @IsOptional()
  @ApiPropertyOptional({ maxLength: 500 })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  externalUrl?: string

  @ApiPropertyOptional({ minimum: 1900, maximum: 2100 })
  @ValidateIf((o: CreatePostDto) => o.type === PostType.OLD_QUESTION || o.examYear !== undefined)
  @IsInt()
  @Min(1900)
  @Max(2100)
  examYear?: number

  @ApiProperty({ minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  moduleNumber: number

  @ApiProperty({ minimum: 1, maximum: 6 })
  @IsInt()
  @Min(1)
  @Max(6)
  year: number

  @ApiProperty({ minimum: 1, maximum: 3 })
  @IsInt()
  @Min(1)
  @Max(3)
  semester: number
}
