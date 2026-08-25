import { Module } from '@nestjs/common'
import { CoursesModule } from '@/modules/courses/courses.module'
import { QuizzesService } from './quizzes.service'
import { QuizzesController } from './quizzes.controller'
import { QuizzesRepository } from './quizzes.repository'
import { AiSummaryModule } from '../ai-summary/ai-summary.module'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [AiSummaryModule, StorageModule, CoursesModule],
  controllers: [QuizzesController],
  providers: [QuizzesService, QuizzesRepository],
  exports: [QuizzesService],
})
export class QuizzesModule {}
