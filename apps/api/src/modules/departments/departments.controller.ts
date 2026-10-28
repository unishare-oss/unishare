import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Roles } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { DepartmentsService } from './departments.service'
import { CreateDepartmentDto } from './dto/create-department.dto'
import { FindDepartmentsDto } from './dto/find-departments.dto'
import { UpdateDepartmentDto } from './dto/update-department.dto'
import { DepartmentEntity, DepartmentWithCoursesEntity } from './entities/department.entity'

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(['ADMIN'])
  @ApiCreatedResponse({ type: DepartmentEntity })
  @ResponseMessage('Department created successfully')
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto)
  }

  @Get()
  @OptionalAuth()
  @ApiOkResponse({ type: [DepartmentEntity] })
  @ResponseMessage('Departments fetched successfully')
  findAll(@Query() query: FindDepartmentsDto) {
    return this.departmentsService.findAll(query.universityId)
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOkResponse({ type: DepartmentWithCoursesEntity })
  @ResponseMessage('Department fetched successfully')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id)
  }

  @Patch(':id')
  @Roles(['ADMIN'])
  @ApiOkResponse({ type: DepartmentEntity })
  @ResponseMessage('Department updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto)
  }

  @Delete(':id')
  @Roles(['ADMIN'])
  @ResponseMessage('Department deleted successfully')
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(id)
  }
}
