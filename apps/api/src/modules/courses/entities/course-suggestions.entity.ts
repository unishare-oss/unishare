import { ApiProperty } from '@nestjs/swagger'

export class CourseSuggestionEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  code: string

  @ApiProperty()
  name: string
}

export class CourseSuggestionsEntity {
  @ApiProperty()
  available: boolean

  @ApiProperty({ type: [CourseSuggestionEntity] })
  suggestions: CourseSuggestionEntity[]
}
