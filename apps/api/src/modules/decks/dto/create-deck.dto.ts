import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'
import { DEFAULT_SLIDES, MAX_SLIDES, MIN_SLIDES } from '../decks.constants'

export class CreateDeckDto {
  @ApiProperty({
    description: 'What the deck should be about',
    example: 'The causes and consequences of the 1997 Asian financial crisis',
  })
  @IsString()
  @MinLength(10, { message: 'Give a bit more detail — at least 10 characters' })
  @MaxLength(2000)
  prompt: string

  @ApiPropertyOptional({ minimum: MIN_SLIDES, maximum: MAX_SLIDES, default: DEFAULT_SLIDES })
  @IsOptional()
  @IsInt()
  @Min(MIN_SLIDES)
  @Max(MAX_SLIDES)
  slideCount?: number

  @ApiPropertyOptional({ default: 'English' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  language?: string

  @ApiPropertyOptional({ default: 'general' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  template?: string
}
