import { ApiProperty } from '@nestjs/swagger'
import { IsDefined, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateSlideDto {
  @ApiProperty({
    description:
      'The slide content object, with edited text. Shape is defined by the slide layout.',
    type: 'object',
    additionalProperties: true,
  })
  @IsDefined()
  content: unknown
}

export class AiEditSlideDto {
  @ApiProperty({ example: 'Make this shorter and add a point about node affinity' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  prompt: string
}
