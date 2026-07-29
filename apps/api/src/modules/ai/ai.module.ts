import { Module } from '@nestjs/common'
import { LlmService } from './llm/llm.service'

@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class AiModule {}
