import { IsArray, IsString, ArrayMinSize } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class InviteMembersDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  userIds: string[]
}
