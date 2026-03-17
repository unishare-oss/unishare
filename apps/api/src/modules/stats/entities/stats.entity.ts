import { ApiProperty } from '@nestjs/swagger'

export class StatsOverviewEntity {
  @ApiProperty()
  totalUsers: number

  @ApiProperty()
  totalPosts: number

  @ApiProperty()
  totalComments: number

  @ApiProperty()
  totalReactions: number
}

export class TopPostEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiProperty()
  shortCode: string

  @ApiProperty()
  views: number

  @ApiProperty()
  reactionCount: number

  @ApiProperty()
  authorName: string
}

export class TopUserEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty({ nullable: true, type: String })
  image: string | null

  @ApiProperty()
  postCount: number

  @ApiProperty({ nullable: true, type: String })
  departmentName: string | null
}

export class StatsEntity {
  @ApiProperty({ type: StatsOverviewEntity })
  overview: StatsOverviewEntity

  @ApiProperty({ type: [TopPostEntity] })
  topPostsByViews: TopPostEntity[]

  @ApiProperty({ type: [TopPostEntity] })
  topPostsByReactions: TopPostEntity[]

  @ApiProperty({ type: [TopUserEntity] })
  topUsers: TopUserEntity[]
}
