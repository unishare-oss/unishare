import { IsString } from 'class-validator'
import { UpdateMessageDto } from '../update-message.dto'

export class WsEditMessageDto extends UpdateMessageDto {
  @IsString()
  messageId: string
}
