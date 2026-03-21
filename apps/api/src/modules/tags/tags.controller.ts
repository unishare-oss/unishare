import { Controller, Get, Query } from '@nestjs/common'
import { ApiQuery, ApiResponse } from '@nestjs/swagger'
import { TagsService } from './tags.service'
import { TagDto } from './dto/tag.dto'

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get('autocomplete')
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Tag name prefix' })
  @ApiResponse({ status: 200, description: 'Tag suggestions', type: [TagDto] })
  async autocomplete(@Query('q') q: string): Promise<any> {
    const suggestions = await this.tagsService.autocomplete(q, 10)
    return {
      success: true,
      data: suggestions,
    }
  }

  @Get('trending')
  @ApiResponse({ status: 200, description: 'Trending tags', type: [TagDto] })
  async trending(): Promise<any> {
    const tags = await this.tagsService.getTrendingTags(10)
    return {
      success: true,
      data: tags,
    }
  }

  @Get('stats')
  @ApiResponse({ status: 200, description: 'Tag statistics' })
  async stats(): Promise<any> {
    const stats = await this.tagsService.getTagStats()
    return {
      success: true,
      data: stats,
    }
  }
}
