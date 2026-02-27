import { ApiProperty } from '@nestjs/swagger'
import { PostEntity } from './post.entity'

export class PaginatedPostEntity {
  @ApiProperty({ type: [PostEntity] })
  items: PostEntity[]

  @ApiProperty()
  total: number

  @ApiProperty()
  page: number

  @ApiProperty()
  limit: number

  @ApiProperty()
  totalPages: number
}
