import { Module } from '@nestjs/common'
import { PostsModule } from '@/modules/posts/posts.module'
import { AiSummaryModule } from '@/modules/ai-summary/ai-summary.module'
import { AiModule } from '@/modules/ai/ai.module'
import { FilesController } from './files.controller'
import { FilesRepository } from './files.repository'
import { FilesService } from './files.service'

@Module({
  imports: [PostsModule, AiSummaryModule, AiModule],
  controllers: [FilesController],
  providers: [FilesService, FilesRepository],
  exports: [FilesService],
})
export class FilesModule {}
