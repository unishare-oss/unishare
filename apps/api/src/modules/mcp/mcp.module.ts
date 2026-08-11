import { Module } from '@nestjs/common'
import { isMcpEnabled } from '@/auth/auth.config'
import { CollabModule } from '@/modules/collab/collab.module'
import { McpController } from './mcp.controller'
import { McpService } from './mcp.service'

@Module({
  imports: [CollabModule],
  controllers: isMcpEnabled ? [McpController] : [],
  providers: [McpService],
})
export class McpModule {}
