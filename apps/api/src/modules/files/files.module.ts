import { Module } from '@nestjs/common'
import { PostsModule } from '@/modules/posts/posts.module'
import { FilesController } from './files.controller'
import { FilesRepository } from './files.repository'
import { FilesService } from './files.service'

@Module({
  imports: [PostsModule],
  controllers: [FilesController],
  providers: [FilesService, FilesRepository],
})
export class FilesModule {}
