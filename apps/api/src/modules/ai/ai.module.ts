import { Module } from '@nestjs/common'
import { LlmService } from './llm/llm.service'
import { DocumentExtractorService } from './extraction/document-extractor.service'
import { EmbeddingService } from './embedding/embedding.service'
import { IngestionService } from './ingestion/ingestion.service'

@Module({
  providers: [LlmService, DocumentExtractorService, EmbeddingService, IngestionService],
  exports: [LlmService, DocumentExtractorService, EmbeddingService, IngestionService],
})
export class AiModule {}
