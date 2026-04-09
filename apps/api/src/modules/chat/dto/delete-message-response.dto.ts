import { ApiProperty } from '@nestjs/swagger'

export class DeleteMessageResponseDto {
  @ApiProperty()
  id: string
}
