import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { FacultiesService } from './faculties.service'
import { FindFacultiesDto } from './dto/find-faculties.dto'
import { FacultyEntity } from './entities/faculty.entity'

@ApiTags('faculties')
@Controller('faculties')
export class FacultiesController {
  constructor(private readonly facultiesService: FacultiesService) {}

  @Get()
  @OptionalAuth()
  @ApiOkResponse({ type: [FacultyEntity] })
  @ResponseMessage('Faculties fetched successfully')
  findAll(@Query() query: FindFacultiesDto) {
    return this.facultiesService.findAll(query.universityId)
  }
}
