import { Module } from '@nestjs/common'
import { CronLockModule } from '@/common/cron-lock.module'
import { UniauthController } from './uniauth.controller'
import { UniauthLogoutService } from './uniauth-logout.service'
import { UniauthUserDeletedService } from './uniauth-user-deleted.service'
import { UniauthThemeService } from './uniauth-theme.service'
import { UniauthDirectoryClient } from './uniauth-directory.client'
import { UniauthIdentityEventsService } from './uniauth-identity-events.service'
import { UniauthReconcileService } from './uniauth-reconcile.service'

/** uniauth → unishare server-to-server callbacks (sign-out, v1 identity events) and the directory. */
@Module({
  imports: [CronLockModule],
  controllers: [UniauthController],
  providers: [
    UniauthLogoutService,
    UniauthUserDeletedService,
    UniauthThemeService,
    UniauthDirectoryClient,
    UniauthIdentityEventsService,
    UniauthReconcileService,
  ],
})
export class UniauthModule {}
