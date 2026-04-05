import { Module } from '@nestjs/common'
import { UniversitiesController } from './universities.controller'
import { UniversitiesService } from './universities.service'
import { UniversitiesRepository } from './universities.repository'

@Module({
  controllers: [UniversitiesController],
  providers: [UniversitiesService, UniversitiesRepository],
  exports: [UniversitiesService],
})
export class UniversitiesModule {}
