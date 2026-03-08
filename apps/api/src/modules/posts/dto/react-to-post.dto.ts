import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'
import { ReactionType } from '@/generated/prisma/client'

export class ReactToPostDto {
  @ApiProperty({ enum: ReactionType })
  @IsEnum(ReactionType)
  type: ReactionType
}
