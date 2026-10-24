import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class MentionableUserEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiPropertyOptional({ nullable: true, type: String })
  image: string | null
}
