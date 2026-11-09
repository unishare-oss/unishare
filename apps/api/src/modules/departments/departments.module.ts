import { Module } from '@nestjs/common'
import { FacultiesModule } from '../faculties/faculties.module'
import { DepartmentsController } from './departments.controller'
import { DepartmentsService } from './departments.service'
import { DepartmentsRepository } from './departments.repository'

@Module({
  imports: [FacultiesModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService, DepartmentsRepository],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
