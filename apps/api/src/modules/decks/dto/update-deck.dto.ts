import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

/**
 * Deliberately NOT `PartialType(CreateDeckDto)`.
 *
 * That DTO carries the generation options — slide count, tone, template, web search — which
 * describe how a deck was made and cannot be changed after the fact. Deriving from it would
 * quietly accept a patch to any of them and silently ignore it. Only the title is editable, so
 * only the title is here.
 */
export class UpdateDeckDto {
  @ApiPropertyOptional({
    description: 'Display title, used for the heading, the library card and the download filename',
    minLength: 1,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  // Matches the cap in decks.processor.ts titleFor(), so a renamed deck cannot exceed what a
  // generated one can.
  @MaxLength(120)
  title?: string
}
