import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string
}
