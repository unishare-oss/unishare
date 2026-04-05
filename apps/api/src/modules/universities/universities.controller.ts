import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { UniversitiesService } from './universities.service'
import { UniversityEntity } from './entities/university.entity'

@ApiTags('universities')
@Controller('universities')
export class UniversitiesController {
  constructor(private readonly universitiesService: UniversitiesService) {}

  @Get()
  @OptionalAuth()
  @ApiOkResponse({ type: [UniversityEntity] })
  @ResponseMessage('Universities fetched successfully')
  findAll() {
    return this.universitiesService.findAll()
  }
}
