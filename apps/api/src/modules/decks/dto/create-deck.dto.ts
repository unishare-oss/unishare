import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'
import {
  DEFAULT_SLIDES,
  DEFAULT_VERBOSITY,
  MAX_SLIDES,
  MIN_SLIDES,
  TONES,
  VERBOSITIES,
} from '../decks.constants'

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

  @ApiPropertyOptional({ enum: TONES, default: 'default' })
  @IsOptional()
  @IsIn(TONES)
  tone?: string

  @ApiPropertyOptional({ enum: VERBOSITIES, default: DEFAULT_VERBOSITY })
  @IsOptional()
  @IsIn(VERBOSITIES)
  verbosity?: string

  @ApiPropertyOptional({ description: 'Extra guidance for the generator' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  includeTitleSlide?: boolean

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  includeTableOfContents?: boolean

  @ApiPropertyOptional({ description: 'Let the generator search the web', default: false })
  @IsOptional()
  @IsBoolean()
  webSearch?: boolean
}
