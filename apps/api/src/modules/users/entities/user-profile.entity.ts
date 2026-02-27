import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class DepartmentEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  code: string
}

export class UserProfileEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  email: string

  @ApiProperty()
  emailVerified: boolean

  @ApiPropertyOptional({ nullable: true, type: String })
  image: string | null

  @ApiProperty({ enum: ['STUDENT', 'MODERATOR', 'ADMIN'] })
  role: string

  @ApiPropertyOptional({ nullable: true, type: String })
  departmentId: string | null

  @ApiPropertyOptional({ nullable: true, type: DepartmentEntity })
  department: DepartmentEntity | null

  @ApiPropertyOptional({ nullable: true, type: Number })
  enrollmentYear: number | null

  @ApiPropertyOptional({ nullable: true, type: Number })
  yearLevel: number | null

  @ApiProperty()
  shouldShowUpdateMajorPopup: boolean
}
