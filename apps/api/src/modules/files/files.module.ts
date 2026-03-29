import { Module } from '@nestjs/common'
import { PostsModule } from '@/modules/posts/posts.module'
import { AiSummaryModule } from '@/modules/ai-summary/ai-summary.module'
import { FilesController } from './files.controller'
import { FilesRepository } from './files.repository'
import { FilesService } from './files.service'

@Module({
  imports: [PostsModule, AiSummaryModule],
  controllers: [FilesController],
  providers: [FilesService, FilesRepository],
})
export class FilesModule {}
