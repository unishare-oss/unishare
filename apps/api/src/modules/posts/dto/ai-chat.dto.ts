import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'

export class AiChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant'

  @ApiProperty({ maxLength: 4000 })
  @IsString()
  @MaxLength(4000)
  content: string
}

export class AiChatDto {
  @ApiProperty({ type: [AiChatMessageDto], minItems: 1, maxItems: 20 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AiChatMessageDto)
  messages: AiChatMessageDto[]
}

export interface AiChatResponse {
  reply: string
  offTopic: boolean
}
