import { IsString } from 'class-validator'

export class WsDeleteMessageDto {
  @IsString()
  messageId: string
}
