import { Module } from '@nestjs/common'
import { AiSummaryService } from './ai-summary.service'
import { TagsModule } from '../tags/tags.module'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [TagsModule, AiModule],
  providers: [AiSummaryService],
  exports: [AiSummaryService],
})
export class AiSummaryModule {}
