import { Module } from '@nestjs/common'
import { DepartmentsController } from './departments.controller'
import { DepartmentsService } from './departments.service'
import { DepartmentsRepository } from './departments.repository'

@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService, DepartmentsRepository],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
