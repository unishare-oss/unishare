import { UserRole } from '@/generated/prisma/enums'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UserDepartmentEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  code: string
}

export class OnboardingRequiredEntity {
  @ApiProperty()
  department: boolean
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

  @ApiPropertyOptional({ nullable: true, type: String })
  bio: string | null

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role: UserRole

  @ApiPropertyOptional({ nullable: true, type: UserDepartmentEntity })
  department: UserDepartmentEntity | null

  @ApiPropertyOptional({ nullable: true, type: Number })
  enrollmentYear: number | null

  @ApiPropertyOptional({ nullable: true, type: Number })
  yearLevel: number | null

  @ApiProperty()
  shouldShowUpdateMajorPopup: boolean

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  postCount: number

  @ApiProperty()
  commentCount: number

  @ApiProperty()
  savedCount: number

  @ApiProperty()
  followerCount: number

  @ApiProperty()
  followingCount: number

  @ApiPropertyOptional({ nullable: true, type: Boolean })
  isFollowing: boolean | null
}
