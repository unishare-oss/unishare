import { Controller, Get } from '@nestjs/common'
import { OptionalAuth } from '@thallesp/nestjs-better-auth'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Get('health')
  @OptionalAuth()
  health(): { status: string } {
    return { status: 'ok' }
  }
}
