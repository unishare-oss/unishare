import { Module } from '@nestjs/common'
import { LlmService } from './llm/llm.service'
import { DocumentExtractorService } from './extraction/document-extractor.service'
import { EmbeddingService } from './embedding/embedding.service'

@Module({
  providers: [LlmService, DocumentExtractorService, EmbeddingService],
  exports: [LlmService, DocumentExtractorService, EmbeddingService],
})
export class AiModule {}
