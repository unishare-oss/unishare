import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Roles } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { DepartmentsService } from './departments.service'
import { CreateDepartmentDto } from './dto/create-department.dto'
import { UpdateDepartmentDto } from './dto/update-department.dto'

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(['ADMIN'])
  @ResponseMessage('Department created successfully')
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto)
  }

  @Get()
  @OptionalAuth()
  @ResponseMessage('Departments fetched successfully')
  findAll() {
    return this.departmentsService.findAll()
  }

  @Get(':id')
  @OptionalAuth()
  @ResponseMessage('Department fetched successfully')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id)
  }

  @Patch(':id')
  @Roles(['ADMIN'])
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
