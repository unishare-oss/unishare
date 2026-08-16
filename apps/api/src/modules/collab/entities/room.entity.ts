import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RoomEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  slug: string

  // `type: String` is required: without it reflection reports Object for a `string | null`
  // union and Orval generates `{ [key: string]: unknown } | null`, which no caller can use as a
  // title without casting.
  @ApiPropertyOptional({ type: String, nullable: true })
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
