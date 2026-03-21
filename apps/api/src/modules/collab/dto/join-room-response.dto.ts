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
}
