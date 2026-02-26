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
} from 'class-validator'
import { PostType } from '@/generated/prisma/client'

export class CreatePostDto {
  @IsEnum(PostType)
  type: PostType

  @IsString()
  courseId: string

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  externalUrl?: string

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  examYear?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  moduleNumber?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  year?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  semester?: number
}
