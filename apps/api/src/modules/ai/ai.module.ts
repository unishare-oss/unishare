import { Module } from '@nestjs/common'
import { LlmService } from './llm/llm.service'
import { DocumentExtractorService } from './extraction/document-extractor.service'

@Module({
  providers: [LlmService, DocumentExtractorService],
  exports: [LlmService, DocumentExtractorService],
})
export class AiModule {}
