import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RoomEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  slug: string

  @ApiPropertyOptional({ nullable: true })
  title: string | null

  @ApiProperty()
  ownerId: string

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date

  @ApiProperty({ enum: ['OPEN', 'VIEW_ONLY', 'PRIVATE'] })
  visibility: string

  @ApiProperty({ description: 'Whether room has a password set (never exposes the hash)' })
  hasPassword: boolean
}
