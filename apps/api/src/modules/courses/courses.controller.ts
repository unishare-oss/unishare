import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Roles } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { CoursesService } from './courses.service'
import { CreateCourseDto } from './dto/create-course.dto'
import { ListCoursesDto } from './dto/list-courses.dto'
import { UpdateCourseDto } from './dto/update-course.dto'
import { ReplaceCourseOutlineDto } from './dto/replace-course-outline.dto'
import { ExtractCourseOutlineDto } from './dto/extract-course-outline.dto'
import { CourseEntity, PaginatedCourseEntity } from './entities/course.entity'
import { CourseModuleOutlineEntity } from './entities/course-module-outline.entity'

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(['ADMIN'])
  @ApiCreatedResponse({ type: CourseEntity })
  @ResponseMessage('Course created successfully')
  create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto)
  }

  @Get()
  @OptionalAuth()
  @ApiOkResponse({ type: PaginatedCourseEntity })
  @ResponseMessage('Courses fetched successfully')
  findAll(@Query() query: ListCoursesDto) {
    const { departmentId, ...pagination } = query
    return this.coursesService.findAll(pagination, departmentId)
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOkResponse({ type: CourseEntity })
  @ResponseMessage('Course fetched successfully')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id)
  }

  @Patch(':id')
  @Roles(['ADMIN'])
  @ApiOkResponse({ type: CourseEntity })
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

  @Get(':id/outline')
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiOkResponse({ type: [CourseModuleOutlineEntity] })
  @ResponseMessage('Course outline fetched successfully')
  getOutline(@Param('id') id: string) {
    return this.coursesService.getOutline(id)
  }

  @Put(':id/outline')
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiOkResponse({ type: [CourseModuleOutlineEntity] })
  @ResponseMessage('Course outline saved successfully')
  replaceOutline(@Param('id') id: string, @Body() dto: ReplaceCourseOutlineDto) {
    return this.coursesService.replaceOutline(id, dto.modules)
  }

  @Post(':id/outline/extract')
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiOkResponse({ type: [CourseModuleOutlineEntity] })
  @ResponseMessage('Course outline extracted successfully')
  extractOutline(@Param('id') id: string, @Body() dto: ExtractCourseOutlineDto) {
    return this.coursesService.extractOutlineFromFile(id, dto.key, dto.mimeType)
  }
}
