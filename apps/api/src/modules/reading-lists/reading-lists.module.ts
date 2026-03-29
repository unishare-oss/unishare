import { Module } from '@nestjs/common'
import { ReadingListsController } from './reading-lists.controller'
import { ReadingListsService } from './reading-lists.service'
import { PrismaService } from '@/prisma/prisma.service'
import { PostsModule } from '../posts/posts.module'

@Module({
  imports: [PostsModule],
  controllers: [ReadingListsController],
  providers: [ReadingListsService, PrismaService],
  exports: [ReadingListsService],
})
export class ReadingListsModule {}
