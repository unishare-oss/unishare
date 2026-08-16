import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'

@ValidatorConstraint({ name: 'lastMessageIsUser', async: false })
class LastMessageIsUserConstraint implements ValidatorConstraintInterface {
  validate(messages: AiChatMessageDto[]) {
    if (!Array.isArray(messages) || messages.length === 0) return false
    return messages[messages.length - 1].role === 'user'
  }

  defaultMessage(_args: ValidationArguments) {
    return 'The last message must be from the user'
  }
}

export class AiChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant'

  // 4000 chars applies to both user input and assistant history entries
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
  @Validate(LastMessageIsUserConstraint)
  messages: AiChatMessageDto[]
}

export class AiChatCitationDto {
  @ApiProperty()
  chunkId: string

  // `type: Number` is required, not decorative. Without it Swagger has no type for a
  // `number | null` union — reflection reports Object — and Orval generated
  // `{ [key: string]: unknown } | null`, so the frontend could not treat a page as a number
  // without casting. The nullability is real (mammoth returns a .docx as one page), so the
  // fix is to declare the type, never to drop the null.
  @ApiProperty({ type: Number, nullable: true, description: 'Null for .docx, which has no pages' })
  pageNum: number | null

  // Without these, a page number on a multi-file post is ambiguous or wrong: chunkIndex — and
  // therefore pageNum — restarts at 1 per file, so "p. 3" could mean page 3 of either document.
  // The UI previously had to suppress page chips entirely on such posts.
  @ApiProperty({ description: 'Which uploaded file this chunk came from' })
  fileId: string

  @ApiProperty({ description: 'Display name of the file, for attributing the page' })
  fileName: string

  @ApiProperty({ description: 'Short excerpt of the cited chunk' })
  snippet: string
}

export class AiChatResponseDto {
  @ApiProperty({ description: 'AI reply text, or "OFF_TOPIC" sentinel' })
  reply: string

  @ApiProperty({ description: 'True when the question was unrelated to the document' })
  offTopic: boolean

  // Empty on the full-text fallback path (a post with no indexed chunks yet) and on any
  // off-topic refusal. Never partially populated: every entry corresponds to a chunk that
  // was actually retrieved and placed in the model's context.
  @ApiProperty({ type: [AiChatCitationDto] })
  citations: AiChatCitationDto[]
}

// Keep alias for internal use
export type AiChatResponse = AiChatResponseDto
