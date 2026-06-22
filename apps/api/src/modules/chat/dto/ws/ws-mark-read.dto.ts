import { IsString } from 'class-validator'

export class WsMarkReadDto {
  @IsString()
  roomId: string
}
