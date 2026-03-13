import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class FulfillPostRequestDto {
  @ApiProperty({ description: 'ID of the post that fulfills this request' })
  @IsString()
  @IsNotEmpty()
  postId: string
}
