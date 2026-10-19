import { Module } from '@nestjs/common'
import { CronLockModule } from '@/common/cron-lock.module'
import { UniauthController } from './uniauth.controller'
import { UniauthLogoutService } from './uniauth-logout.service'
import { UniauthUserDeletedService } from './uniauth-user-deleted.service'
import { UniauthUserUpdatedService } from './uniauth-user-updated.service'
import { UniauthThemeService } from './uniauth-theme.service'
import { UniauthDirectoryClient } from './uniauth-directory.client'
import { UniauthIdentityEventsService } from './uniauth-identity-events.service'
import { UniauthReconcileService } from './uniauth-reconcile.service'

/** uniauth → unishare server-to-server callbacks (sign-out, account deletion and updates). */
@Module({
  imports: [CronLockModule],
  controllers: [UniauthController],
  providers: [
    UniauthLogoutService,
    UniauthUserDeletedService,
    UniauthUserUpdatedService,
    UniauthThemeService,
    UniauthDirectoryClient,
    UniauthIdentityEventsService,
    UniauthReconcileService,
  ],
})
export class UniauthModule {}
