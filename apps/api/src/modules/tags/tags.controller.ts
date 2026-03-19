import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiProperty, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger'
import { TagsService } from './tags.service'
import { CreateTagDto } from './dto/create-tag.dto'
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
