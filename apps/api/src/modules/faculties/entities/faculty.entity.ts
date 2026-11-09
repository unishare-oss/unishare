import { ApiProperty } from '@nestjs/swagger'

export class FacultyEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  universityId: string
}
