import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class CreateFulfillmentSuggestionDto {
  @ApiProperty({ description: 'ID of the post to suggest as fulfillment' })
  @IsString()
  @IsNotEmpty()
  postId: string
}
