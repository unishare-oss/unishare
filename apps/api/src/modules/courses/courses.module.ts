import { Module } from '@nestjs/common'
import { AiSummaryModule } from '@/modules/ai-summary/ai-summary.module'
import { CoursesController } from './courses.controller'
import { CoursesRepository } from './courses.repository'
import { CoursesService } from './courses.service'

@Module({
  imports: [AiSummaryModule],
  controllers: [CoursesController],
  providers: [CoursesService, CoursesRepository],
  exports: [CoursesService],
})
export class CoursesModule {}
