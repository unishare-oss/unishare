import { Module } from '@nestjs/common'
import { FacultiesController } from './faculties.controller'
import { FacultiesService } from './faculties.service'
import { FacultiesRepository } from './faculties.repository'

@Module({
  controllers: [FacultiesController],
  providers: [FacultiesService, FacultiesRepository],
  exports: [FacultiesService],
})
export class FacultiesModule {}
