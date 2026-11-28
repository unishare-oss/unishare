import { Module } from '@nestjs/common'
import { MyCoursesController } from './my-courses.controller'
import { MyCoursesRepository } from './my-courses.repository'
import { MyCoursesService } from './my-courses.service'

@Module({
  controllers: [MyCoursesController],
  providers: [MyCoursesService, MyCoursesRepository],
  exports: [MyCoursesService],
})
export class MyCoursesModule {}
