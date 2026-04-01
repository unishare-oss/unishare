import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { FeedbackType } from '@/generated/prisma/client'

export class CreateFeedbackDto {
  @ApiProperty({ enum: FeedbackType, description: 'Type of feedback' })
  @IsEnum(FeedbackType)
  type: FeedbackType

  @ApiProperty({ description: 'Feedback message', minLength: 10, maxLength: 2000 })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string
}
