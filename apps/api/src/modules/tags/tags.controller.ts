import { Controller, Get, Query } from '@nestjs/common'
import { ApiQuery, ApiTags } from '@nestjs/swagger'
import { OptionalAuth } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { TagsService } from './tags.service'

@ApiTags('tags')
@Controller('tags')
@OptionalAuth()
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
