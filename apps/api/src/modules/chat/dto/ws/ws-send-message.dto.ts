import { IsString } from 'class-validator'
import { SendMessageDto } from '../send-message.dto'

export class WsSendMessageDto extends SendMessageDto {
  @IsString()
  roomId: string
}
