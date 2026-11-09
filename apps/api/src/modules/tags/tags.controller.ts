import { Controller, Get, Query } from '@nestjs/common'
import { ApiQuery, ApiTags } from '@nestjs/swagger'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { GuestReadOnly } from '@/common/decorators/guest-read-only.decorator'
import { TagsService } from './tags.service'

@ApiTags('tags')
@GuestReadOnly()
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get('autocomplete')
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Tag name prefix' })
  @ResponseMessage('Tag suggestions fetched successfully')
  autocomplete(@Query('q') q: string) {
    if (!q?.trim()) return []
    return this.tagsService.autocomplete(q.trim(), 10)
  }

  @Get('trending')
  @ResponseMessage('Trending tags fetched successfully')
  trending() {
    return this.tagsService.getTrendingTags(10)
  }

  @Get('stats')
  @ResponseMessage('Tag statistics fetched successfully')
  stats() {
    return this.tagsService.getTagStats()
  }
}
