import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class FollowUserEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiPropertyOptional({ nullable: true, type: String })
  image: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  publicKey: string | null
}
