import { ApiProperty } from '@nestjs/swagger'

export class JoinRoomResponseDto {
  @ApiProperty()
  roomSlug: string

  @ApiProperty()
  sessionId: string

  @ApiProperty()
  userId: string

  @ApiProperty()
  displayName: string

  @ApiProperty()
  isAnonymous: boolean

  @ApiProperty()
  isViewOnly: boolean

  @ApiProperty()
  ownerId: string

  @ApiProperty({
    description: 'Whether board content is end-to-end encrypted (key in URL fragment)',
  })
  encrypted: boolean
}
