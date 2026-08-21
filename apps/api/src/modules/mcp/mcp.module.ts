import { Module } from '@nestjs/common'
import { isMcpEnabled } from '@/auth/auth.config'
import { CollabModule } from '@/modules/collab/collab.module'
import { PostsModule } from '@/modules/posts/posts.module'
import { CoursesModule } from '@/modules/courses/courses.module'
import { PrismaModule } from '@/prisma/prisma.module'
import { FilesModule } from '@/modules/files/files.module'
import { McpController } from './mcp.controller'
import { McpService } from './mcp.service'
import { McpRepository } from './mcp.repository'

@Module({
  imports: [CollabModule, PostsModule, CoursesModule, PrismaModule, FilesModule],
  controllers: isMcpEnabled ? [McpController] : [],
  providers: [McpService, McpRepository],
})
export class McpModule {}
