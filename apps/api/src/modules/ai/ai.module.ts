import { Module } from '@nestjs/common'
import { CronLockModule } from '@/common/cron-lock.module'
import { LlmService } from './llm/llm.service'
import { DocumentExtractorService } from './extraction/document-extractor.service'
import { EmbeddingService } from './embedding/embedding.service'
import { IngestionService } from './ingestion/ingestion.service'
import { IngestionScheduler } from './ingestion/ingestion.scheduler'
import { RetrievalService } from './retrieval/retrieval.service'

@Module({
  imports: [CronLockModule],
  // IngestionScheduler is a provider only: nothing injects it, the @Cron decorator drives it.
  providers: [
    LlmService,
    DocumentExtractorService,
    EmbeddingService,
    IngestionService,
    IngestionScheduler,
    RetrievalService,
  ],
  exports: [
    LlmService,
    DocumentExtractorService,
    EmbeddingService,
    IngestionService,
    RetrievalService,
  ],
})
export class AiModule {}
