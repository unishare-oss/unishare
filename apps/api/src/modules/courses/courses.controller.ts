import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Roles } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { CoursesService } from './courses.service'
import { CreateCourseDto } from './dto/create-course.dto'
import { UpdateCourseDto } from './dto/update-course.dto'

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(['ADMIN'])
  @ResponseMessage('Course created successfully')
  create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto)
  }

  @Get()
  @OptionalAuth()
  @ResponseMessage('Courses fetched successfully')
  findAll(@Query() pagination: PaginationDto) {
    return this.coursesService.findAll(pagination)
  }

  @Get(':id')
  @OptionalAuth()
  @ResponseMessage('Course fetched successfully')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id)
  }

  @Patch(':id')
  @Roles(['ADMIN'])
  @ResponseMessage('Course updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(id, dto)
  }

  @Delete(':id')
  @Roles(['ADMIN'])
  @ResponseMessage('Course deleted successfully')
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id)
  }
}
