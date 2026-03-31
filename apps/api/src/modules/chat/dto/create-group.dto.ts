import { IsArray, IsString, ArrayMinSize } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateGroupDto {
  @ApiProperty({ description: 'Group name' })
  @IsString()
  name: string

  @ApiProperty({ type: [String], description: 'Array of user IDs to add to group' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  participantIds: string[]
}
