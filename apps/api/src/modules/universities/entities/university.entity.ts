import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UniversityEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  shortName: string

  @ApiPropertyOptional({ type: String, nullable: true })
  logoUrl: string | null
}
