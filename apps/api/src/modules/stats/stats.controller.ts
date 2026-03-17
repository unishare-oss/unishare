import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { StatsService } from './stats.service'
import { StatsEntity } from './entities/stats.entity'

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOkResponse({ type: StatsEntity })
  @ResponseMessage('Stats fetched successfully')
  getStats() {
    return this.statsService.getStats()
  }
}
