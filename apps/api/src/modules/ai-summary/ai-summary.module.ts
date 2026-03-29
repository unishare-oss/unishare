import { Module } from '@nestjs/common'
import { AiSummaryService } from './ai-summary.service'
import { TagsModule } from '../tags/tags.module'

@Module({
  imports: [TagsModule],
  providers: [AiSummaryService],
  exports: [AiSummaryService],
})
export class AiSummaryModule {}
